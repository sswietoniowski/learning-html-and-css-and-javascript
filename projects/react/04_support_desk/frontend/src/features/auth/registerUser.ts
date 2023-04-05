import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  FetchUserError,
  RegisterUserRequest,
  RegisterUserResponse,
} from './types';
import apiUrl from '../../config/api';

export const registerUser = createAsyncThunk<
  RegisterUserResponse,
  RegisterUserRequest,
  { rejectValue: FetchUserError }
>('auth/register', async (user: RegisterUserRequest, thunkApi) => {
  console.log(`[REDUX] Register: ${JSON.stringify(user)}`);

  const response = await fetch(`${apiUrl}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });

  if (response.status !== 201) {
    return thunkApi.rejectWithValue({ message: 'Could not register user!' });
  }

  const data: RegisterUserResponse =
    (await response.json()) as RegisterUserResponse;
  return data;
});
