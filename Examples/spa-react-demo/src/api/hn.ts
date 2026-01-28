import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { HNItem, StoryType } from '../types/hn';
import { HN_API_BASE } from '../utils/constants';

export const hnApi = createApi({
    reducerPath: 'hnApi',
    baseQuery: fetchBaseQuery({ baseUrl: HN_API_BASE }),
    endpoints: (builder) => ({
        getStoryIds: builder.query<number[], StoryType>({
            query: (type) => `/${type}stories.json`
        }),
        getItem: builder.query<HNItem, number>({
            query: (id) => `/item/${id}.json`
        }),
        getItems: builder.query<HNItem[], number[]>({
            async queryFn(ids, _api, _options, fetchWithBQ) {
                const results = await Promise.all(
                    ids.map((id) => fetchWithBQ(`/item/${id}.json`))
                );

                const items = results
                    .map((result) => result.data as HNItem)
                    .filter((item) => item && !item.deleted && !item.dead);

                return { data: items };
            }
        }),
        getUser: builder.query<import('../types/hn').HNUser, string>({
            query: (id) => `/user/${id}.json`
        })
    })
});

export const {
    useGetStoryIdsQuery,
    useGetItemQuery,
    useGetItemsQuery,
    useGetUserQuery
} = hnApi;
