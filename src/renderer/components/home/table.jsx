import React, { useState } from 'react';
import {
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
} from '../../redux/api/documents/documentApiSlice';
import toast from 'react-hot-toast';

export const TableWithPagination = ({ data, rowsPerPage = 10 }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  const [searchTerm, setSearchTerm] = useState('');

  // Update and delete mutations
  const [updateDocument] = useUpdateDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();

  // Modal states
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  // Form state for update
  const [updateFormData, setUpdateFormData] = useState({
    documentType: '',
    vehicleType: '',
    vehicleNumber: '',
    issueDate: '',
    expirationDate: '',
  });

  const getStatusValue = (doc) => {
    const expired = isDocumentExpired(doc.expirationDate);
    const expiringSoon = isDocumentExpiringSoon(doc.expirationDate);

    if (expired) return 0; // Expired
    if (expiringSoon) return 1; // Expiring Soon
    return 2; // Valid
  };

  // Handle update button click
  const handleUpdateClick = (document) => {
    setSelectedDocument(document);
    setUpdateFormData({
      documentType: document.documentType,
      vehicleType: document.vehicleType,
      vehicleNumber: document.vehicleNumber,
      issueDate: document.issueDate.split('T')[0], // Convert to YYYY-MM-DD format
      expirationDate: document.expirationDate.split('T')[0], // Convert to YYYY-MM-DD format
    });
    setIsUpdateModalOpen(true);
  };

  // Handle update form submission
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDocument({
        id: selectedDocument.id,
        document: updateFormData,
      }).unwrap();

      setIsUpdateModalOpen(false);
      setSelectedDocument(null);
      toast.success('Document updated successfully!');
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    }
  };

  // Handle delete button click
  const handleDeleteClick = (document) => {
    setDocumentToDelete(document);
    setShowDeleteConfirm(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      await deleteDocument(documentToDelete.id).unwrap();
      setShowDeleteConfirm(false);
      setDocumentToDelete(null);
      toast.success('Document deleted successfully!');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // Handle delete cancel
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDocumentToDelete(null);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSort = (column) => {
    console.log('Sorting by column:', column);
    console.log('Sort column:', sortColumn);

    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  // Filter data based on search term
  const filteredData = data.filter(
    (doc) =>
      doc.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.vehicleType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue;
    let bValue;

    switch (sortColumn) {
      case 'status':
        aValue = getStatusValue(a);
        bValue = getStatusValue(b);
        break;
      case 'issueDate':
      case 'expirationDate':
        aValue = new Date(a[sortColumn]).getTime();
        bValue = new Date(b[sortColumn]).getTime();
        break;
      case 'serialNumber':
        aValue = a.id;
        bValue = b.id;
        break;
      default: // For text fields: vehicleNumber, vehicleType, documentType
        aValue = a[sortColumn].toLowerCase();
        bValue = b[sortColumn].toLowerCase();
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = sortedData.slice(startIndex, startIndex + rowsPerPage);

  // Pagination helpers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  // Empty state
  if (data.length === 0) {
    return (
      <div className='p-6'>
        <div className='text-center py-12'>
          <div className='mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
            <svg
              className='w-12 h-12 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-900 mb-2'>
            No documents found
          </h3>
          <p className='text-gray-500'>
            Add your first vehicle document to get started.
          </p>
        </div>
      </div>
    );
  }

  // No search results state
  if (searchTerm && sortedData.length === 0) {
    return (
      <div className='p-6'>
        {/* Table Header with Stats */}
        <div className='flex justify-between items-center mb-6'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900'>
              Documents uploaded
            </h2>
            <p className='text-sm text-gray-600 mt-1'>
              No results found for "{searchTerm}"
            </p>
          </div>
        </div>

        {/* Modern Search Bar */}
        <div className='mb-6'>
          <div className='relative max-w-md'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <svg
                className='h-5 w-5 text-gray-400'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                />
              </svg>
            </div>
            <input
              type='text'
              placeholder='Search by vehicle number, type, or document type...'
              value={searchTerm}
              onChange={handleSearchChange}
              className='block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200'
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className='absolute inset-y-0 right-0 pr-3 flex items-center'
              >
                <svg
                  className='h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className='text-center py-12'>
          <div className='mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
            <svg
              className='w-12 h-12 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-medium text-gray-900 mb-2'>
            No documents match your search
          </h3>
          <p className='text-gray-500 mb-4'>
            Try searching with different keywords or clear your search to see
            all documents.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          >
            Clear Search
          </button>
        </div>
      </div>
    );
  }

  const renderSortIndicator = (column) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? '▲' : '▼';
    }
    return '';
  };

  return (
    <div className='p-6'>
      {/* Table Header with Stats */}
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h2 className='text-xl font-semibold text-gray-900'>
            Documents uploaded
          </h2>
          <p className='text-sm text-gray-600 mt-1'>
            Showing {startIndex + 1}-
            {Math.min(startIndex + rowsPerPage, sortedData.length)} of{' '}
            {sortedData.length} documents
            {searchTerm && (
              <span className='text-blue-600 font-medium'>
                {' '}
                (filtered from {data.length} total)
              </span>
            )}
          </p>
        </div>
        <div className='text-sm text-gray-500'>
          Page {currentPage} of {totalPages}
        </div>
      </div>

      {/* Modern Search Bar */}
      <div className='mb-6'>
        <div className='relative max-w-md'>
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <svg
              className='h-5 w-5 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </div>
          <input
            type='text'
            placeholder='Search by vehicle number, type, or document type...'
            value={searchTerm}
            onChange={handleSearchChange}
            className='block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200'
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className='absolute inset-y-0 right-0 pr-3 flex items-center'
            >
              <svg
                className='h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors duration-200'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className='overflow-hidden rounded-xl shadow-sm border border-gray-200 bg-white'>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200'>
              <tr>
                <th
                  className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('serialNumber')}
                >
                  Sr No.{renderSortIndicator('serialNumber')}
                </th>
                <th
                  className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('documentType')}
                >
                  Document Type{renderSortIndicator('documentType')}
                </th>
                <th
                  className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('vehicleType')}
                >
                  Vehicle Type{renderSortIndicator('vehicleType')}
                </th>
                <th
                  className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('vehicleNumber')}
                >
                  Vehicle No.{renderSortIndicator('vehicleNumber')}
                </th>
                <th
                  className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('issueDate')}
                >
                  Issue Date{renderSortIndicator('issueDate')}
                </th>
                <th
                  className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('expirationDate')}
                >
                  Expiry Date{renderSortIndicator('expirationDate')}
                </th>
                <th
                  className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('status')}
                >
                  Status{renderSortIndicator('status')}
                </th>
                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {currentData.map((doc, index) => {
                const isExpiringSoon = isDocumentExpiringSoon(
                  doc.expirationDate
                );
                const isExpired = isDocumentExpired(doc.expirationDate);

                return (
                  <tr
                    key={index}
                    className='hover:bg-gray-50 transition-colors duration-150'
                  >
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900'>
                        #{doc.id}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600'>
                        {doc.documentType}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600'>
                        {doc.vehicleType}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='text-sm font-medium text-gray-900'>
                        {doc.vehicleNumber}
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                      {formatDate(doc.issueDate)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-600'>
                      {formatDate(doc.expirationDate)}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {isExpired ? (
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                          Expired
                        </span>
                      ) : isExpiringSoon ? (
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
                          Expiring Soon
                        </span>
                      ) : (
                        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                          Valid
                        </span>
                      )}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                      <div className='flex space-x-2'>
                        <button
                          onClick={() => handleUpdateClick(doc)}
                          className='inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150'
                        >
                          <svg
                            className='w-3 h-3 mr-1'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                            />
                          </svg>
                          Update
                        </button>
                        <button
                          onClick={() => handleDeleteClick(doc)}
                          className='inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150'
                        >
                          <svg
                            className='w-3 h-3 mr-1'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                            />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Pagination Controls */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between mt-6'>
          <div className='flex items-center justify-end space-x-2 w-full'>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className='inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150'
            >
              <svg
                className='w-4 h-4 mr-1'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 19l-7-7 7-7'
                />
              </svg>
              Previous
            </button>

            <div className='flex items-center space-x-1'>
              {getVisiblePages().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && goToPage(page)}
                  disabled={page === '...'}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    page === currentPage
                      ? 'bg-blue-600 text-white shadow-sm'
                      : page === '...'
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className='inline-flex items-center px-3 py-2 text-sm font-small text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150'
            >
              Next
              <svg
                className='w-4 h-4 ml-1'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Update Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40
        ${isUpdateModalOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className='flex justify-between items-center px-4 border-b'>
          <h2 className='text-lg font-semibold pt-6'>Update Document</h2>
          <button
            onClick={() => setIsUpdateModalOpen(false)}
            className='text-gray-600 hover:text-gray-900'
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <div className='p-4 overflow-y-auto h-full'>
          <form onSubmit={handleUpdateSubmit} className='w-full mx-auto'>
            {/* Document Type */}
            <div className='px-7'>
              <div className='mb-5'>
                <label
                  htmlFor='update-document-type'
                  className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'
                >
                  Enter document type
                </label>
                <input
                  type='text'
                  id='update-document-type'
                  className='shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light'
                  placeholder='e.g., puc, rc, Insurance'
                  required
                  value={updateFormData.documentType}
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      documentType: e.target.value,
                    })
                  }
                />
              </div>

              {/* Vehicle Type */}
              <div className='mb-5'>
                <label
                  htmlFor='update-vehicle-type'
                  className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'
                >
                  Enter vehicle type
                </label>
                <input
                  type='text'
                  id='update-vehicle-type'
                  className='shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light'
                  placeholder='e.g., car, bike, truck'
                  required
                  value={updateFormData.vehicleType}
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      vehicleType: e.target.value,
                    })
                  }
                />
              </div>

              {/* Vehicle Number */}
              <div className='mb-5'>
                <label
                  htmlFor='update-vehicle-number'
                  className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'
                >
                  Enter vehicle plate number
                </label>
                <input
                  type='text'
                  id='update-vehicle-number'
                  className='shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light'
                  pattern='[A-Z]{2}-[0-9]{2}-[A-Z]{2}-[0-9]{4}'
                  required
                  value={updateFormData.vehicleNumber}
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      vehicleNumber: e.target.value,
                    })
                  }
                />
              </div>

              {/* Issue Date */}
              <div className='mb-5'>
                <label
                  htmlFor='update-issue-date'
                  className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'
                >
                  Enter document issue date
                </label>
                <input
                  type='date'
                  id='update-issue-date'
                  className='shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light'
                  required
                  value={updateFormData.issueDate}
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      issueDate: e.target.value,
                    })
                  }
                />
              </div>

              {/* Expiration Date */}
              <div className='mb-5'>
                <label
                  htmlFor='update-expiration-date'
                  className='block mb-2 text-sm font-medium text-gray-900 dark:text-white'
                >
                  Enter document expiration date
                </label>
                <input
                  type='date'
                  id='update-expiration-date'
                  className='shadow-xs bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 dark:shadow-xs-light'
                  required
                  value={updateFormData.expirationDate}
                  onChange={(e) =>
                    setUpdateFormData({
                      ...updateFormData,
                      expirationDate: e.target.value,
                    })
                  }
                />
              </div>

              {/* Submit Button */}
              <div className='mb-5'>
                <button
                  type='button'
                  onClick={handleUpdateSubmit}
                  className='inline-flex items-center px-3 py-2 text-sm font-small text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150'
                  disabled={Object.values(updateFormData).some(
                    (value) => value == ''
                  )}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Backdrop for Update Drawer */}
      {isUpdateModalOpen && (
        <div
          onClick={() => setIsUpdateModalOpen(false)}
          className='fixed inset-0 z-30'
        ></div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className='fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md transition transform duration-300 ease-out animate-[fadeInDown_0.3s_ease-out]'>
          {/* Dialog */}
          <div className='relative bg-white rounded-lg shadow-xl'>
            <div className='px-6 py-4'>
              <div className='flex items-center mb-4'>
                <div className='flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100'>
                  <svg
                    className='h-6 w-6 text-red-600'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                    />
                  </svg>
                </div>
                <div className='ml-4'>
                  <h3 className='text-lg font-medium text-gray-900'>
                    Delete Document
                  </h3>
                </div>
              </div>

              <div className='mb-6'>
                <p className='text-sm text-gray-500'>
                  Are you sure you want to delete this document? This action
                  cannot be undone.
                </p>
                {documentToDelete && (
                  <p className='text-sm text-gray-700 mt-2 font-medium'>
                    Document: {documentToDelete.documentType} -{' '}
                    {documentToDelete.vehicleNumber}
                  </p>
                )}
              </div>

              <div className='flex justify-end space-x-3'>
                <button
                  type='button'
                  onClick={handleDeleteCancel}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleDeleteConfirm}
                  className='px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const formatDate = (date) => {
  const newDate = new Date(date);
  return `${newDate.getDate()}/${newDate.getMonth() + 1}/${newDate.getFullYear()}`;
};

const isDocumentExpired = (expirationDate) => {
  const today = new Date();
  const expiry = new Date(expirationDate);
  return expiry < today;
};

const isDocumentExpiringSoon = (expirationDate) => {
  const today = new Date();
  const expiry = new Date(expirationDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  return expiry >= today && expiry <= thirtyDaysFromNow;
};
