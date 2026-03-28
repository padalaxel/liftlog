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

type Ctx = {
  open: boolean;
  active: NumericEntryActive;
  buffer: string;
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

function buildOrder(exercises: ExerciseCardData[]) {
  return exercises.flatMap((ex) => ex.sets.map((s) => ({ exerciseId: ex.id, setId: s.id })));
}

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

type ProviderProps = {
  children: ReactNode;
  exercises: ExerciseCardData[];
  onCommit: (
    exerciseId: string,
    setId: string,
    field: "actualReps" | "actualWeight",
    value: number | null,
  ) => void;
  syncFocus: (exerciseId: string, setId: string, field: "actualReps" | "actualWeight") => void;
};

export function NumericEntryProvider({ children, exercises, onCommit, syncFocus }: ProviderProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<NumericEntryActive>(null);
  const [buffer, setBuffer] = useState("");
  const [firstDigit, setFirstDigit] = useState(true);
  const exercisesRef = useRef(exercises);
  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  const kind = active?.kind ?? "reps";

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
      setActive({ exerciseId, setId, kind: k });
      setBuffer(initial != null && initial !== undefined ? String(Math.round(Number(initial))) : "");
      setFirstDigit(true);
      setOpen(true);
    },
    [syncFocus],
  );

  const openReps = useCallback(
    (exerciseId: string, setId: string, initial: number | null | undefined) => {
      openSheet(exerciseId, setId, "reps", initial, false);
    },
    [openSheet],
  );

  const openWeight = useCallback(
    (exerciseId: string, setId: string, initial: number | null | undefined) => {
      openSheet(exerciseId, setId, "weight", initial, false);
    },
    [openSheet],
  );

  const closeOnly = useCallback(() => {
    setOpen(false);
    setActive(null);
    setBuffer("");
    setFirstDigit(true);
  }, []);

  const commitBufferToWorkout = useCallback(() => {
    if (!active || active.kind === "rpe") return;
    const field = active.kind === "reps" ? "actualReps" : "actualWeight";
    const raw = buffer.trim();
    if (raw === "") {
      onCommit(active.exerciseId, active.setId, field, null);
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    onCommit(active.exerciseId, active.setId, field, n);
  }, [active, buffer, onCommit]);

  const dismiss = useCallback(() => {
    commitBufferToWorkout();
    closeOnly();
  }, [closeOnly, commitBufferToWorkout]);

  const digit = useCallback(
    (d: string) => {
      if (!/^\d$/.test(d)) return;
      if (firstDigit) {
        setBuffer(d);
        setFirstDigit(false);
        return;
      }
      setBuffer((b) => {
        const next = b + d;
        return next.length <= 6 ? next : b;
      });
    },
    [firstDigit],
  );

  const backspace = useCallback(() => {
    setBuffer((b) => b.slice(0, -1));
    setFirstDigit(false);
  }, []);

  const adjust = useCallback(
    (delta: number) => {
      if (!active || active.kind === "rpe") return;
      const current = parseInt(buffer, 10);
      const base = Number.isFinite(current) ? current : 0;
      const next = Math.max(0, base + delta);
      setBuffer(String(next));
      setFirstDigit(false);
    },
    [active, buffer],
  );

  const next = useCallback(() => {
    if (!active || active.kind === "rpe") return;
    commitBufferToWorkout();
    const ex = exercisesRef.current;
    const order = buildOrder(ex);
    const idx = order.findIndex(
      (o) => o.exerciseId === active.exerciseId && o.setId === active.setId,
    );
    if (idx < 0 || idx >= order.length - 1) {
      closeOnly();
      return;
    }
    const nxt = order[idx + 1];
    const init = getSetValue(ex, nxt.exerciseId, nxt.setId, active.kind);
    openSheet(nxt.exerciseId, nxt.setId, active.kind, init, true);
  }, [active, closeOnly, commitBufferToWorkout, openSheet]);

  const isCellActive = useCallback(
    (exerciseId: string, setId: string, cell: "reps" | "weight") => {
      if (!open || !active) return false;
      const k = cell === "reps" ? "reps" : "weight";
      return active.exerciseId === exerciseId && active.setId === setId && active.kind === k;
    },
    [open, active],
  );

  const value = useMemo<Ctx>(
    () => ({
      open,
      active,
      buffer,
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
    [open, active, buffer, kind, openReps, openWeight, dismiss, digit, backspace, next, adjust, isCellActive],
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
