import { configureStore } from '@reduxjs/toolkit';
import { hnApi } from '../api/hn';

export const store = configureStore({
    reducer: {
        [hnApi.reducerPath]: hnApi.reducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(hnApi.middleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
