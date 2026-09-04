import api from "../config/api";

// LOGIN

export async function loginUser(email, password) { //this email and passowrd comes from the frontend

  const response = await api.post(  //posting to the backedn and returning the data:
//     POST /api/auth/login
// Content-Type: application/json

// {
//     "email": "john@gmail.com",
//     "password": "123456"
// }
    "/auth/login",
    {
      email,
      password
    }
  );
//   response = {
//     data: {
//         token: "...",
//         user: {...}
//     },
//     status: 200,
//     headers: {...}
// }

  return response.data;  //data is token and user(has name email pass)
}


// SIGNUP

export async function signupUser( //name email and password fromthe user frontend
  name,
  email,
  password
) {

  const response = await api.post( // the details are sen tto the backend url
    "/auth/signup",
    {
      name,
      email,
      password
    }
  );

  return response.data; 
}