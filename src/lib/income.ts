export const incomeReportCodes = ["CERT", "TRA", "CV", "CM", "AUT", "AGEN", "BOL", "FUT", "RR", "REP"] as const;

export const incomeConcepts = [
  { code: "CERT_ESTUDIOS", label: "Cert. Estudios", reportCode: "CERT" },
  { code: "CERT_CONDUCTA", label: "Cert. Conducta", reportCode: "CERT" },
  { code: "DER_PENSIONES", label: "Der. Pensiones", reportCode: "CERT" },
  { code: "DER_APLAZADOS", label: "Der. E. Aplazados", reportCode: "CERT" },
  { code: "DER_SUBSANACION", label: "Der. E. Subsanación", reportCode: "CERT" },
  { code: "DER_REVALIDACION", label: "Der. E. Revalidación", reportCode: "CERT" },
  { code: "DER_CARGO", label: "Der. E. Cargo", reportCode: "AUT" },
  { code: "RECT_NOMBRES", label: "Rect. Nombres", reportCode: "RR" },
  { code: "TRAS_MATRICULA", label: "Tras. Matrícula", reportCode: "TRA" },
  { code: "CONST_MATRICULA", label: "Const. Matrícula", reportCode: "CM" },
  { code: "CONST_VACANTE", label: "Const. Vacante", reportCode: "CV" },
  { code: "AGENDA_ESCOLAR", label: "Agenda Escolar", reportCode: "AGEN" },
  { code: "FUT", label: "FUT", reportCode: "FUT" },
  { code: "OTROS", label: "Otros", reportCode: "REP" },
] as const;
