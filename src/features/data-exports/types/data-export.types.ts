export type DataExportSensitivityClass =
  | "LOW"
  | "AGGREGATE"
  | "OPERATIONAL"
  | "SENSITIVE_OPERATIONAL"
  | "SENSITIVE_PII"
  | "PRIVILEGED";

export type DataExportDeliveryMode = "ASYNC_JOB" | "EXISTING_WORKFLOW";
export type DataExportPurposePolicy =
  | "OPTIONAL"
  | "REQUIRED_CODE_AND_NOTE"
  | "EXISTING_WORKFLOW";
export type DataExportFilterControl = "TEXT" | "INTEGER" | "DATE" | "SELECT";

export interface DataExportFilterDefinition {
  key: string;
  label: string;
  control: DataExportFilterControl;
  placeholder?: string;
  dependsOn?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface DataExportFieldBundle {
  code: string;
  label: string;
  description: string;
}

export interface DataExportCatalogItem {
  code: string;
  label: string;
  description: string;
  sensitivityClass: DataExportSensitivityClass;
  formats: string[];
  fieldBundles: DataExportFieldBundle[];
  supportedFilters: string[];
  filterDefinitions: DataExportFilterDefinition[];
  requiredPermissions: string[];
  purposePolicy: DataExportPurposePolicy;
  deliveryMode: DataExportDeliveryMode;
  workflowPath?: string;
  status: "AVAILABLE" | "PLANNED";
}

export interface DataExportCatalogResponse {
  success: true;
  data: DataExportCatalogItem[];
}

export type DataExportJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED";

export interface DataExportJob {
  id: string;
  datasetCode: string;
  fieldBundleCode: string;
  outputFormat: "CSV";
  sensitivityClass: DataExportSensitivityClass;
  status: DataExportJobStatus;
  progressPercent: number;
  exportedRowCount: number | null;
  artifactSizeBytes: number | null;
  failureCode: string | null;
  failureSummary: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataExportJobListResponse {
  success: true;
  data: DataExportJob[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface DataExportJobResponse {
  success: true;
  data: DataExportJob;
}

export interface CreateDataExportJobPayload {
  datasetCode: string;
  fieldBundleCode: string;
  filters?: Record<string, unknown>;
  purposeCode?: string;
  purposeNote?: string;
}
