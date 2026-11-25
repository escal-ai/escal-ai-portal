"use client";

import React, { useState } from "react";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  PhoneForwarded,
  XCircle,
  Filter,
} from "lucide-react";
import { CallLogEntry } from "../../types/portal";

interface SupportCallLogsProps {
  calls: CallLogEntry[];
  lang: "es" | "en";
}

export const SupportCallLogs: React.FC<SupportCallLogsProps> = ({
  calls,
  lang,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredCalls = calls.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  const getStatusBadge = (status: CallLogEntry["status"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            {lang === "es" ? "Completada" : "Completed"}
          </span>
        );
      case "transferred":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <PhoneForwarded className="h-3 w-3 text-purple-600" />
            {lang === "es" ? "Transferida" : "Transferred"}
          </span>
        );
      case "allergy_escalated":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
            <AlertTriangle className="h-3 w-3 text-red-600" />
            {lang === "es" ? "Alergia Escalada" : "Allergy Flag"}
          </span>
        );
      case "abandoned":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="h-3 w-3 text-slate-500" />
            {lang === "es" ? "Informativa / Cortada" : "Abandoned"}
          </span>
        );
    }
  };

  return (
    <div data-surface="support" className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Header and CIPA Privacy Notice */}
      <div className="bg-[var(--surface-raised)] p-5 rounded-2xl border border-[var(--border-subtle)] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            {lang === "es" ? "Consola de Auditoría de Llamadas (LatAm QA)" : "Call Audit Console (LatAm QA)"}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {lang === "es"
              ? "Cumplimiento CIPA/CCPA California: Números de teléfono enmascarados y audios protegidos a nivel de servidor."
              : "California CIPA/CCPA Compliance: Phone numbers masked and audio downloads scrubbed server-side."}
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 bg-[var(--surface-muted)] p-1 rounded-xl border border-[var(--border-subtle)] text-xs font-bold">
          <Filter className="h-3.5 w-3.5 text-[var(--text-muted)] ml-2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-[var(--text-secondary)] focus:outline-none pr-3 py-1 cursor-pointer"
          >
            <option value="all">{lang === "es" ? "Todos los Estados" : "All Outcomes"}</option>
            <option value="completed">{lang === "es" ? "Completadas" : "Completed"}</option>
            <option value="transferred">{lang === "es" ? "Transferidas" : "Transferred"}</option>
            <option value="allergy_escalated">{lang === "es" ? "Alergias" : "Allergies"}</option>
            <option value="abandoned">{lang === "es" ? "Informativas / Abandonadas" : "Abandoned"}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-muted)] text-[var(--text-muted)] uppercase tracking-wider font-extrabold border-b border-[var(--border-subtle)]">
              <tr>
                <th className="p-3.5">ID Llamada</th>
                <th className="p-3.5">Teléfono (Enmascarado)</th>
                <th className="p-3.5">Fecha y Hora</th>
                <th className="p-3.5">Duración</th>
                <th className="p-3.5">Idioma</th>
                <th className="p-3.5">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-[var(--text-muted)]">
                    {lang === "es" ? "No se encontraron llamadas registradas" : "No call records found"}
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.call_id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[var(--text-primary)]">
                      {call.call_id.slice(0, 14)}...
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[var(--text-secondary)]">
                      {call.caller_phone_e164}
                    </td>
                    <td className="p-3.5 text-[var(--text-muted)] tabular-nums">
                      {new Date(call.started_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-semibold text-[var(--text-primary)] tabular-nums">
                      {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                    </td>
                    <td className="p-3.5 uppercase font-extrabold text-[var(--text-muted)]">
                      {call.language_detected}
                    </td>
                    <td className="p-3.5">{getStatusBadge(call.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
