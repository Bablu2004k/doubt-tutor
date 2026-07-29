import axiosClient from "./axiosClient.js";

export const authApi = {
  register: (data) => axiosClient.post("/auth/register", data),
  login: (data) => axiosClient.post("/auth/login", data),
};

export const problemApi = {
  // sessionId groups every follow-up into the same chat. Pass the current
  // chat's sessionId (or leave it undefined to start a brand-new chat).
  createFromText: (text, subject, sessionId) =>
    axiosClient.post("/problems", { text, subject, sessionId }),
  createFromImage: (file, subject, sessionId) => {
    const form = new FormData();
    form.append("image", file);
    form.append("subject", subject);
    if (sessionId) form.append("sessionId", sessionId);
    return axiosClient.post("/problems", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: () => axiosClient.get("/problems"),
  getSession: (sessionId) => axiosClient.get(`/problems/session/${sessionId}`),
  generateQuestion: (problemId, difficulty) =>
    axiosClient.post(`/problems/${problemId}/questions`, { difficulty }),
  removeSession: (sessionId) => axiosClient.delete(`/problems/session/${sessionId}`),
  toggleSessionPin: (sessionId) => axiosClient.patch(`/problems/session/${sessionId}/pin`),
};

export const attemptApi = {
  submit: (questionId, submittedAnswer) =>
    axiosClient.post("/attempts", { questionId, submittedAnswer }),
  list: () => axiosClient.get("/attempts"),
};

export const roadmapApi = {
  create: (goal, weeks) => axiosClient.post("/roadmap", { goal, weeks }),
  get: () => axiosClient.get("/roadmap"),
  list: () => axiosClient.get("/roadmap/all"),
  regenerate: (id) => axiosClient.patch(`/roadmap/${id}/regenerate`),
  completePhase: (id, order) => axiosClient.patch(`/roadmap/${id}/phases/${order}/complete`),
  remove: (id) => axiosClient.delete(`/roadmap/${id}`),
};
