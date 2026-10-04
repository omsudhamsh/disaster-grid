import { apiGet, apiPost } from "./api";

export async function getIncidents() {
  const data = await apiGet("/api/incidents/");
  return data.incidents;
}

export async function getIncident(id) {
  return apiGet(`/api/incidents/${id}`);
}

export async function reportIncident(payload) {
  return apiPost("/api/incidents/", payload);
}
