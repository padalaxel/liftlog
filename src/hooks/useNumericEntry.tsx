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
  /** Weight only: inserts a single decimal point when valid. */
  decimal: () => void;
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

/** Strong-like ± steps: weight in 5 lb, reps in 1. */
function getAdjustStep(kind: NumericFieldKind): number {
  if (kind === "weight") return 5;
  if (kind === "reps") return 1;
  return 1;
}

const MAX_BUFFER_LEN_REPS = 6;
/** Digits + optional single decimal for weight (e.g. 12.25). */
const MAX_BUFFER_LEN_WEIGHT = 12;

function weightBufferFromInitial(initial: number | null | undefined): string {
  if (initial == null || initial === undefined) return "";
  const n = Number(initial);
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(4).replace(/\.?0+$/, "");
  return s === "" ? String(n) : s;
}

function formatWeightBufferDisplay(n: number): string {
  const r = Math.round(Math.max(0, n) * 100) / 100;
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(2).replace(/\.?0+$/, "") || "0";
}

function parseCommittedWeight(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function parseCommittedReps(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
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
      if (ctx.kind === "reps") {
        if (raw.endsWith(".")) return;
        const n = parseCommittedReps(raw);
        if (n === null) return;
        onLiveChange({ exerciseId: ctx.exerciseId, setId: ctx.setId, field, value: n });
        return;
      }
      if (raw === "." || raw.endsWith(".")) {
        const n = parseFloat(raw);
        if (Number.isFinite(n)) {
          onLiveChange({ exerciseId: ctx.exerciseId, setId: ctx.setId, field, value: n });
        }
        return;
      }
      const w = parseCommittedWeight(raw);
      if (w === null) return;
      onLiveChange({ exerciseId: ctx.exerciseId, setId: ctx.setId, field, value: w });
    },
    [onLiveChange],
  );

  /** Commit buffer for a specific active context (used when switching fields while sheet stays open). */
  const commitBufferForContext = useCallback(
    (ctx: NumericEntryActive) => {
      if (!ctx || ctx.kind === "rpe") return;
      const field = ctx.kind === "reps" ? "actualReps" : "actualWeight";
      const raw = bufferRef.current.trim();
      if (raw === "") {
        onCommit(ctx.exerciseId, ctx.setId, field, null);
        return;
      }
      if (ctx.kind === "reps") {
        const n = parseCommittedReps(raw);
        if (n === null) return;
        onCommit(ctx.exerciseId, ctx.setId, field, n);
        return;
      }
      const w = parseCommittedWeight(raw.endsWith(".") ? raw.slice(0, -1) : raw);
      if (w === null) return;
      onCommit(ctx.exerciseId, ctx.setId, field, w);
    },
    [onCommit],
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
      const prev = activeRef.current;
      if (
        prev &&
        prev.kind !== "rpe" &&
        prev.exerciseId === exerciseId &&
        prev.setId === setId &&
        prev.kind === k
      ) {
        return;
      }
      if (
        prev &&
        prev.kind !== "rpe" &&
        (prev.exerciseId !== exerciseId || prev.setId !== setId || prev.kind !== k)
      ) {
        commitBufferForContext(prev);
      }
      if (syncParentFocus) {
        const field = k === "reps" ? "actualReps" : "actualWeight";
        syncFocus(exerciseId, setId, field);
      }
      const nextActive: NumericEntryActive = { exerciseId, setId, kind: k };
      activeRef.current = nextActive;
      setActive(nextActive);
      const buf =
        initial != null && initial !== undefined
          ? k === "weight"
            ? weightBufferFromInitial(initial)
            : String(Math.round(Number(initial)))
          : "";
      replaceNextDigitRef.current = true;
      bufferRef.current = buf;
      setBuffer(buf);
      setOpen(true);
      emitLiveChange({ exerciseId, setId, kind: k }, buf);
    },
    [syncFocus, emitLiveChange, commitBufferForContext],
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
    let raw = bufferRef.current.trim();
    if (raw.endsWith(".")) raw = raw.slice(0, -1);
    if (raw === "") {
      onCommit(a.exerciseId, a.setId, field, null);
      return;
    }
    if (a.kind === "reps") {
      const n = parseCommittedReps(raw);
      if (n === null) return;
      onCommit(a.exerciseId, a.setId, field, n);
      return;
    }
    const w = parseCommittedWeight(raw);
    if (w === null) return;
    onCommit(a.exerciseId, a.setId, field, w);
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
        const maxLen = a.kind === "weight" ? MAX_BUFFER_LEN_WEIGHT : MAX_BUFFER_LEN_REPS;
        if (replaceNextDigitRef.current) {
          next = d;
          replaceNextDigitRef.current = false;
        } else {
          const cand = prev + d;
          if (a.kind === "weight") {
            if (!/^\d*\.?\d*$/.test(cand) || cand.length > maxLen) return prev;
            const [, frac] = cand.split(".");
            if (frac != null && frac.length > 4) return prev;
            next = cand;
          } else {
            next = cand.length <= maxLen ? cand : prev;
          }
        }
        bufferRef.current = next;
        emitLiveChange(a, next);
        return next;
      });
    },
    [emitLiveChange],
  );

  const decimal = useCallback(() => {
    const a = activeRef.current;
    if (!a || a.kind !== "weight") return;
    setBuffer((prev) => {
      let next: string;
      if (replaceNextDigitRef.current) {
        next = "0.";
        replaceNextDigitRef.current = false;
      } else {
        if (prev.includes(".")) return prev;
        const base = prev === "" ? "0" : prev;
        next = `${base}.`;
      }
      if (next.length > MAX_BUFFER_LEN_WEIGHT) return prev;
      bufferRef.current = next;
      emitLiveChange(a, next);
      return next;
    });
  }, [emitLiveChange]);

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

  /** `sign` is +1 or -1 from keypad; step is 5 lb for weight, 1 for reps. */
  const adjust = useCallback(
    (sign: number) => {
      const a = activeRef.current;
      if (!a || a.kind === "rpe") return;
      replaceNextDigitRef.current = false;
      const step = getAdjustStep(a.kind);
      const effectiveDelta = (sign >= 0 ? 1 : -1) * step;
      setBuffer((prev) => {
        let raw = prev.trim();
        if (raw.endsWith(".")) raw = raw.slice(0, -1);
        const current =
          a.kind === "weight"
            ? parseFloat(raw)
            : parseInt(raw, 10);
        const base = Number.isFinite(current) ? current : 0;
        const nextVal = Math.max(0, base + effectiveDelta);
        const s = a.kind === "weight" ? formatWeightBufferDisplay(nextVal) : String(nextVal);
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
  }, [closeOnly, commitRepsForAdvance, openSheet]);

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
      decimal,
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
      decimal,
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
