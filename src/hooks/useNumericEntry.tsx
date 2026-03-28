"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ExerciseCardData } from "@/types/workout-ui";

export type NumericFieldKind = "reps" | "weight" | "rpe";

export type NumericEntryActive = {
  exerciseId: string;
  setId: string;
  kind: NumericFieldKind;
} | null;

/** Fires on every buffer change while the keypad is open (digits, backspace, ±). */
export type NumericLiveChangeInput = {
  exerciseId: string;
  setId: string;
  field: "actualReps" | "actualWeight";
  value: number | null;
};

type Ctx = {
  open: boolean;
  active: NumericEntryActive;
  buffer: string;
  /** Same as active.kind when sheet is open; use for UI (weight vs reps). */
  fieldType: "weight" | "reps" | "rpe" | null;
  kind: NumericFieldKind;
  openReps: (exerciseId: string, setId: string, initial: number | null | undefined) => void;
  openWeight: (exerciseId: string, setId: string, initial: number | null | undefined) => void;
  /** Commit buffer to workout state and close (backdrop, keyboard icon, last Next) */
  close: () => void;
  digit: (d: string) => void;
  backspace: () => void;
  next: () => void;
  adjust: (delta: number) => void;
  isCellActive: (exerciseId: string, setId: string, kind: "reps" | "weight") => boolean;
};

const NumericEntryContext = createContext<Ctx | null>(null);

function getSetValue(
  exercises: ExerciseCardData[],
  exerciseId: string,
  setId: string,
  kind: "reps" | "weight",
): number | null | undefined {
  const ex = exercises.find((e) => e.id === exerciseId);
  const set = ex?.sets.find((s) => s.id === setId);
  if (!set) return undefined;
  return kind === "reps" ? set.actualReps : set.actualWeight;
}

function getRepMaxForExercise(exercises: ExerciseCardData[], exerciseId: string): number | null {
  const ex = exercises.find((e) => e.id === exerciseId);
  return ex?.repRange?.max ?? null;
}

export type NumericEntryBridgeApi = {
  openWeight: (exerciseId: string, setId: string, initial?: number | null) => void;
  openReps: (exerciseId: string, setId: string, initial?: number | null) => void;
  close: () => void;
};

type ProviderProps = {
  children: ReactNode;
  exercises: ExerciseCardData[];
  onCommit: (
    exerciseId: string,
    setId: string,
    field: "actualReps" | "actualWeight",
    value: number | null,
  ) => void;
  /** Live row updates while keypad is open (digits, backspace, ±). Same shape as commit; does not hit the API. */
  onLiveChange?: (input: NumericLiveChangeInput) => void;
  /** After reps Next: complete set, timer, advance (parent opens next keypad). */
  onRepsNext?: (input: { exerciseId: string; setId: string }) => void;
  /** Register imperative open/close for advancing flow after reps. */
  registerNumericApi?: (api: NumericEntryBridgeApi | null) => void;
  syncFocus: (exerciseId: string, setId: string, field: "actualReps" | "actualWeight") => void;
};

export function NumericEntryProvider({
  children,
  exercises,
  onCommit,
  onLiveChange,
  onRepsNext,
  registerNumericApi,
  syncFocus,
}: ProviderProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NumericEntryActive>(null);
  const [buffer, setBuffer] = useState("");
  const exercisesRef = useRef(exercises);
  const activeRef = useRef<NumericEntryActive>(null);
  /** Mirrors buffer for synchronous commit (Next/dismiss) without stale React state. */
  const bufferRef = useRef("");
  /** Next digit replaces entire buffer (open sheet or after explicit replace mode). */
  const replaceNextDigitRef = useRef(true);

  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const onRepsNextRef = useRef(onRepsNext);
  useEffect(() => {
    onRepsNextRef.current = onRepsNext;
  }, [onRepsNext]);

  const kind = active?.kind ?? "reps";
  const fieldType = active?.kind ?? null;

  const emitLiveChange = useCallback(
    (ctx: { exerciseId: string; setId: string; kind: NumericFieldKind }, buf: string) => {
      if (!onLiveChange || ctx.kind === "rpe") return;
      const field = ctx.kind === "reps" ? "actualReps" : "actualWeight";
      const raw = buf.trim();
      if (raw === "") {
        onLiveChange({ exerciseId: ctx.exerciseId, setId: ctx.setId, field, value: null });
        return;
      }
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n)) return;
      onLiveChange({ exerciseId: ctx.exerciseId, setId: ctx.setId, field, value: n });
    },
    [onLiveChange],
  );

  const openSheet = useCallback(
    (
      exerciseId: string,
      setId: string,
      k: NumericFieldKind,
      initial: number | null | undefined,
      syncParentFocus = false,
    ) => {
      if (k === "rpe") return;
      if (syncParentFocus) {
        const field = k === "reps" ? "actualReps" : "actualWeight";
        syncFocus(exerciseId, setId, field);
      }
      const nextActive: NumericEntryActive = { exerciseId, setId, kind: k };
      activeRef.current = nextActive;
      setActive(nextActive);
      const buf =
        initial != null && initial !== undefined ? String(Math.round(Number(initial))) : "";
      replaceNextDigitRef.current = true;
      bufferRef.current = buf;
      setBuffer(buf);
      setOpen(true);
      emitLiveChange(
        { exerciseId, setId, kind: k },
        buf,
      );
    },
    [syncFocus, emitLiveChange],
  );

  const openReps = useCallback(
    (exerciseId: string, setId: string, initial: number | null | undefined) => {
      openSheet(exerciseId, setId, "reps", initial, true);
    },
    [openSheet],
  );

  const openWeight = useCallback(
    (exerciseId: string, setId: string, initial: number | null | undefined) => {
      openSheet(exerciseId, setId, "weight", initial, true);
    },
    [openSheet],
  );

  const closeOnly = useCallback(() => {
    setOpen(false);
    activeRef.current = null;
    setActive(null);
    bufferRef.current = "";
    setBuffer("");
    replaceNextDigitRef.current = true;
  }, []);

  const commitBufferToWorkout = useCallback(() => {
    const a = activeRef.current;
    if (!a || a.kind === "rpe") return;
    const field = a.kind === "reps" ? "actualReps" : "actualWeight";
    const raw = bufferRef.current.trim();
    if (raw === "") {
      onCommit(a.exerciseId, a.setId, field, null);
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    onCommit(a.exerciseId, a.setId, field, n);
  }, [onCommit]);

  /** Finalize reps for Strong-style Next: empty buffer → repRange.max when available. */
  const commitRepsForAdvance = useCallback(() => {
    const a = activeRef.current;
    if (!a || a.kind !== "reps") return;
    const raw = bufferRef.current.trim();
    if (raw === "") {
      const maxR = getRepMaxForExercise(exercisesRef.current, a.exerciseId);
      if (maxR != null) {
        const s = String(maxR);
        bufferRef.current = s;
        setBuffer(s);
        onCommit(a.exerciseId, a.setId, "actualReps", maxR);
        onLiveChange?.({
          exerciseId: a.exerciseId,
          setId: a.setId,
          field: "actualReps",
          value: maxR,
        });
      } else {
        onCommit(a.exerciseId, a.setId, "actualReps", null);
        onLiveChange?.({
          exerciseId: a.exerciseId,
          setId: a.setId,
          field: "actualReps",
          value: null,
        });
      }
      return;
    }
    commitBufferToWorkout();
  }, [commitBufferToWorkout, onCommit, onLiveChange]);

  const dismiss = useCallback(() => {
    commitBufferToWorkout();
    closeOnly();
  }, [closeOnly, commitBufferToWorkout]);

  const digit = useCallback(
    (d: string) => {
      if (!/^\d$/.test(d)) return;
      const a = activeRef.current;
      if (!a || a.kind === "rpe") return;
      setBuffer((prev) => {
        let next: string;
        if (replaceNextDigitRef.current) {
          next = d;
          replaceNextDigitRef.current = false;
        } else {
          const cand = prev + d;
          next = cand.length <= 6 ? cand : prev;
        }
        bufferRef.current = next;
        emitLiveChange(a, next);
        return next;
      });
    },
    [emitLiveChange],
  );

  const backspace = useCallback(() => {
    const a = activeRef.current;
    if (!a || a.kind === "rpe") return;
    setBuffer((prev) => {
      const next = prev.slice(0, -1);
      replaceNextDigitRef.current = false;
      bufferRef.current = next;
      emitLiveChange(a, next);
      return next;
    });
  }, [emitLiveChange]);

  const adjust = useCallback(
    (delta: number) => {
      const a = activeRef.current;
      if (!a || a.kind === "rpe") return;
      replaceNextDigitRef.current = false;
      setBuffer((prev) => {
        const current = parseInt(prev, 10);
        const base = Number.isFinite(current) ? current : 0;
        const nextVal = Math.max(0, base + delta);
        const s = String(nextVal);
        bufferRef.current = s;
        emitLiveChange(a, s);
        return s;
      });
    },
    [emitLiveChange],
  );

  const next = useCallback(() => {
    const a = activeRef.current;
    if (!a || a.kind === "rpe") return;

    if (a.kind === "weight") {
      commitBufferToWorkout();
      const ex = exercisesRef.current;
      const init = getSetValue(ex, a.exerciseId, a.setId, "reps");
      openSheet(a.exerciseId, a.setId, "reps", init, true);
      return;
    }

    const exId = a.exerciseId;
    const sid = a.setId;
    commitRepsForAdvance();
    closeOnly();
    onRepsNextRef.current?.({ exerciseId: exId, setId: sid });
  }, [closeOnly, commitBufferToWorkout, commitRepsForAdvance, openSheet]);

  const isCellActive = useCallback(
    (exerciseId: string, setId: string, cell: "reps" | "weight") => {
      if (!open || !active) return false;
      const k = cell === "reps" ? "reps" : "weight";
      return active.exerciseId === exerciseId && active.setId === setId && active.kind === k;
    },
    [open, active],
  );

  useEffect(() => {
    registerNumericApi?.({
      openWeight,
      openReps,
      close: dismiss,
    });
    return () => registerNumericApi?.(null);
  }, [registerNumericApi, openWeight, openReps, dismiss]);

  const value = useMemo<Ctx>(
    () => ({
      open,
      active,
      buffer,
      fieldType,
      kind,
      openReps,
      openWeight,
      close: dismiss,
      digit,
      backspace,
      next,
      adjust,
      isCellActive,
    }),
    [
      open,
      active,
      buffer,
      fieldType,
      kind,
      openReps,
      openWeight,
      dismiss,
      digit,
      backspace,
      next,
      adjust,
      isCellActive,
    ],
  );

  return <NumericEntryContext.Provider value={value}>{children}</NumericEntryContext.Provider>;
}

export function useNumericEntry(): Ctx {
  const ctx = useContext(NumericEntryContext);
  if (!ctx) {
    throw new Error("useNumericEntry must be used within NumericEntryProvider");
  }
  return ctx;
}

export function useNumericEntryOptional(): Ctx | null {
  return useContext(NumericEntryContext);
}
