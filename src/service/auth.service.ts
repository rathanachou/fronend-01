import api from "./libs/axios";

export interface PayLoad {
  email:    string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  gender:    string;
  role:      string;
}

export interface AuthResponse {
  message: string;
  data:    string; // JWT token
}

export interface RegisterResponse {
  message: string;
  data: {
    id:        number;
    firstName: string;
    lastName:  string;
    email:     string;
    role:      string;
    gender:    string;
  };
}

//  interceptor unwraps .data already — no need for res.data
export const authLogin = async (request: PayLoad): Promise<AuthResponse> => {
  return api.post("/api/v1/auth/login", request);
};

export const authRegister = async (
  request: RegisterPayload
): Promise<RegisterResponse> => {
  return api.post("/api/v1/auth/register", request);
};