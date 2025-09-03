const API_URL = 'http://localhost:8800/api';
// const API_URL = 'https://healthtrackerapp.novam.us/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 204) {
      return null;
    }
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

const getAuthHeaders = (token) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const registerUser = async (name, email, password, role) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password, role }),
  });
  return handleResponse(response);
};

export const loginUser = async (email, password, role) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, role }),
  });
  return handleResponse(response);
};

export const getAllProviders = async (token) => {
  const response = await fetch(`${API_URL}/admin/providers`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const getProviderDetails = async (token, providerId) => {
  const response = await fetch(`${API_URL}/admin/providers/${providerId}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const getAllPatients = async (token) => {
  const response = await fetch(`${API_URL}/admin/patients`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const getPatientDetails = async (token, patientId) => {
  const response = await fetch(`${API_URL}/admin/patients/${patientId}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const updateUser = async (token, userId, role, data) => {
  const url = role === 'provider' ? `${API_URL}/admin/providers/${userId}` : `${API_URL}/admin/patients/${userId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const deleteUser = async (token, userId, role) => {
  const url = role === 'provider' ? `${API_URL}/admin/providers/${userId}` : `${API_URL}/admin/patients/${userId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const assignPatientToProvider = async (token, providerId, patientId) => {
  const response = await fetch(`${API_URL}/admin/assign-patient`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ patientId,providerId }),
  });
  return handleResponse(response);
};

export const providerGetAllPatients = async (token) => {
  const response = await fetch(`${API_URL}/provider/patients`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const providerGetPatientDetails = async (token, patientId) => {
  const response = await fetch(`${API_URL}/provider/patients/${patientId}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const providerGetPatientSymptoms = async (token, patientId) => {
  const response = await fetch(`${API_URL}/provider/patients/${patientId}/symptoms`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const providerUpdatePatient = async (token, patientId, data) => {
  const response = await fetch(`${API_URL}/provider/patients/${patientId}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const patientGetSymptomsHistory = async (token) => {
  const response = await fetch(`${API_URL}/patient/symptoms/history`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const patientAddSymptom = async (token, data) => {
  const response = await fetch(`${API_URL}/patient/symptoms`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const patientUpdateSymptom = async (token, symptomId, data) => {
  const response = await fetch(`${API_URL}/patient/symptoms/${symptomId}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const patientDeleteSymptom = async (token, symptomId) => {
  const response = await fetch(`${API_URL}/patient/symptoms/${symptomId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

export const patientAddProvider = async (token, providerId) => {
  const response = await fetch(`${API_URL}/patient/providers`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ providerId }),
  });
  return handleResponse(response);
};

export const patientGenerateReport = async (token) => {
  const response = await fetch(`${API_URL}/patient/report`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
};

// === Provider: Link Requests ===

export async function providerGetLinkRequests(token) {
  const res = await fetch(`${API_URL}/provider/link-requests`, {
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || data?.message || "Failed to fetch link requests");
  return data;
}

export async function providerAcceptLinkRequest(token, requestId) {
  const res = await fetch(`${API_URL}/provider/link-requests/${requestId}/accept`, {
    method: "POST",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || data?.message || "Failed to accept link request");
  return data;
}

export async function providerRejectLinkRequest(token, requestId) {
  const res = await fetch(`${API_URL}/provider/link-requests/${requestId}/reject`, {
    method: "POST",
    headers: getAuthHeaders(token),
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || data?.message || "Failed to reject link request");
  return data;
}