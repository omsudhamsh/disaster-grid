export async function getIncidents() {
  const response = await fetch("http://127.0.0.1:8000/api/incidents/");

  if (!response.ok) {
    throw new Error("Failed to fetch incidents");
  }

  const data = await response.json();

  return data.incidents;
}

export async function getIncident(id) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/incidents/${id}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch incident");
  }

  return await response.json();
}