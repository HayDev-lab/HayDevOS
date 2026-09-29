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

import type { CreateLeadInput, LeadListQuery, SlaPolicyInput } from "@/lib/leads/schemas";
import type { LeadDetailDto, LeadListDto, LeadOverviewDto } from "@/lib/leads/types";
import {
  addLeadNoteRequest,
  changeLeadStageRequest,
  completeLeadTaskRequest,
  createLeadRequest,
  fetchLeadDetail,
  fetchLeadList,
  fetchLeadOverview,
  updateSlaPolicyRequest,
} from "./api";

interface LeadOSDataValue {
  overview: LeadOverviewDto | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  listLeads: (query: Partial<LeadListQuery>) => Promise<LeadListDto>;
  getLead: (id: string) => Promise<LeadDetailDto>;
  createLead: (input: CreateLeadInput) => Promise<LeadDetailDto>;
  changeStage: (id: string, input: { stageId?: string; stage?: string; pipelineId?: string }) => Promise<LeadDetailDto>;
  addNote: (id: string, body: string) => Promise<void>;
  completeTask: (id: string, completed: boolean) => Promise<void>;
  updateSla: (input: SlaPolicyInput) => Promise<void>;
}

const LeadOSDataContext = createContext<LeadOSDataValue | null>(null);

export function LeadOSDataProvider({ children }: { children: ReactNode }) {
  const [overview, setOverview] = useState<LeadOverviewDto | null>(null);
  const overviewRef = useRef<LeadOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!overviewRef.current) setLoading(true);
    try {
      const next = await fetchLeadOverview();
      overviewRef.current = next;
      setOverview(next);
      setError(null);
    } catch (cause) {
      overviewRef.current = null;
      setOverview(null);
      setError(cause instanceof Error ? cause.message : "LeadOS data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchLeadOverview().then((next) => {
      if (cancelled) return;
      overviewRef.current = next;
      setOverview(next);
      setError(null);
    }).catch((cause) => {
      if (cancelled) return;
      overviewRef.current = null;
      setOverview(null);
      setError(cause instanceof Error ? cause.message : "LeadOS data could not be loaded");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const createLead = useCallback(async (input: CreateLeadInput) => {
    const lead = await createLeadRequest(input);
    await refresh();
    return lead;
  }, [refresh]);

  const changeStage = useCallback(async (
    id: string,
    input: { stageId?: string; stage?: string; pipelineId?: string },
  ) => {
    const lead = await changeLeadStageRequest(id, input);
    await refresh();
    return lead;
  }, [refresh]);

  const addNote = useCallback(async (id: string, body: string) => {
    await addLeadNoteRequest(id, body);
    await refresh();
  }, [refresh]);

  const completeTask = useCallback(async (id: string, completed: boolean) => {
    await completeLeadTaskRequest(id, completed);
    await refresh();
  }, [refresh]);

  const updateSla = useCallback(async (input: SlaPolicyInput) => {
    await updateSlaPolicyRequest(input);
    await refresh();
  }, [refresh]);

  const value = useMemo<LeadOSDataValue>(() => ({
    overview,
    loading,
    error,
    refresh,
    listLeads: fetchLeadList,
    getLead: fetchLeadDetail,
    createLead,
    changeStage,
    addNote,
    completeTask,
    updateSla,
  }), [overview, loading, error, refresh, createLead, changeStage, addNote, completeTask, updateSla]);

  return <LeadOSDataContext.Provider value={value}>{children}</LeadOSDataContext.Provider>;
}

export function useLeadOSData(): LeadOSDataValue {
  const value = useContext(LeadOSDataContext);
  if (!value) throw new Error("useLeadOSData must be used inside LeadOSDataProvider");
  return value;
}
