import { apiSlice } from '../index';
import { TCreateDocumnet } from './document.types';

export const documentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Fetch all documents
     */
    getDocuments: builder.query({
      query: () => ({
        url: '/docs/puc',
        method: 'GET',
      }),
      providesTags: ['documents'],
    }),

    /**
     * Create a new document
     */
    createDocument: builder.mutation({
      query: (document: TCreateDocumnet) => ({
        url: '/docs/puc',
        method: 'POST',
        body: document,
      }),
      invalidatesTags: ['documents', 'stats'],
    }),

    /**
     * Update a document
     */
    updateDocument: builder.mutation({
      query: ({ id, document }: { id: string; document: TCreateDocumnet }) => ({
        url: `/docs/puc/${id}`,
        method: 'PUT',
        body: document,
      }),
      invalidatesTags: ['documents', 'stats'],
    }),

    /**
     * Delete a document
     */
    deleteDocument: builder.mutation({
      query: (id: string) => ({
        url: `/docs/puc/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['documents', 'stats'],
    }),

    /**
     * Get document stats
     */
    getStats: builder.query({
      query: () => ({
        url: 'docs/stats',
        method: 'GET',
      }),
      providesTags: ['stats'],
    }),

    /**
     * Export PUC documents as CSV with optional filters.
     * Filters: vehicleNumber, vehicleType, documentType,
     *          issueDateFrom, issueDateTo, expirationDateFrom, expirationDateTo
     */
    exportPUCDocuments: builder.query({
      query: (filters: Record<string, string> = {}) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
        const qs = params.toString();
        return {
          url: `/docs/puc/export${qs ? `?${qs}` : ''}`,
          method: 'GET',
          responseHandler: (response) => response.blob(),
        };
      },
    }),

    /**
     * Import PUC documents from CSV text.
     * Body: { csvContent: string }
     * Returns: { message, inserted, skipped, errors[] }
     */
    importPUCDocuments: builder.mutation({
      query: (csvContent: string) => ({
        url: '/docs/puc/import',
        method: 'POST',
        body: { csvContent },
      }),
      invalidatesTags: ['documents', 'stats'],
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useGetStatsQuery,
  useLazyExportPUCDocumentsQuery,
  useImportPUCDocumentsMutation,
} = documentApiSlice;
