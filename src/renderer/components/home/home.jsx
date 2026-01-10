import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import {
  useCreateDocumentMutation,
  useGetDocumentsQuery,
  useGetStatsQuery,
} from '../../redux/api/documents/documentApiSlice';
import { TableWithPagination } from './table';
import { UploadForm } from './upload-form';
import { WarningCards } from './warning-cards';
import { Stats } from './stats';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';

export function HomePage() {
  const { data = [], isLoading, isError } = useGetDocumentsQuery();
  const {
    data: stats,
    isLoading: isStatsLoading,
    isError: isStatsError,
    error: statsError,
  } = useGetStatsQuery();

  let totalDocuments = 0;
  let expieredDocs = 0;
  let expiringThisMonth = 0;

  if (stats) {
    totalDocuments = stats.totalDocuments ?? 0;
    expieredDocs = stats.expieredDocs ?? 0;
    expiringThisMonth = stats.expiringThisMonth ?? 0;
  }

  const [createDocument] = useCreateDocumentMutation();

  const [isOpen, setIsOpen] = useState(false);

  let userName = 'guest';
  const name = localStorage.getItem('userName');
  if (name) userName = name;

  const handleSubmit = async (document, resetForm) => {
    try {
      await createDocument(document).unwrap();

      resetForm();
      setIsOpen(false);
      toast.success('Document uploaded!');
    } catch (error) {
      console.error('Error uploading document: %s', error);
      toast.error('Failed to upload document');
    }
  };

  const expiringDocuments = data.filter((document) => {
    const expDate = new Date(document.expirationDate);

    const daysToExpire = Math.ceil(
      (expDate - new Date()) / (1000 * 60 * 60 * 24)
    );

    return daysToExpire <= 30 && daysToExpire > 0;
  });

  return (
    <div>
      {/* Navbar */}
      <div>
        <nav className='bg-black text-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 mb-5'>
          <div className='max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between'>
            <Link
              to='/home'
              className='flex items-center space-x-3 rtl:space-x-reverse'
            >
              <span className='self-center text-2xl font-semibold whitespace-nowrap dark:text-white'>
                DocAlert
              </span>
            </Link>

            <div className='flex items-center space-x-4'>
              <p className='dark:text-gray-300'>Welcome back, {userName}</p>
              <div className='w-10 h-10 overflow-hidden bg-gray-100 rounded-full dark:bg-gray-600 flex items-center justify-center'>
                <svg
                  className='w-8 h-8 text-gray-400'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'
                    clipRule='evenodd'
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className='p-4 bg-gray-50 font-sans pb-20'>
        <div className='w-full max-w-7xl mx-auto'>
          {isStatsLoading && <p>Loading stats...</p>}
          {isStatsError &&
            toast.error(
              `Error fetching stats: ${statsError?.message || 'Unknown error'}`
            )}
          {!isStatsLoading && !isStatsError && stats && (
            <Stats
              totalDocuments={totalDocuments}
              expieredDocs={expieredDocs}
              expiringThisMonth={expiringThisMonth}
            />
          )}
        </div>

        {/* Expiring Documents */}
        <div className='w-full max-w-7xl px-6 py-3 mx-auto my-5 shadow-lg rounded-xl'>
          <WarningCards documents={expiringDocuments} />
        </div>

        <div className='flex flex-col items-center'>
          {/* Document table with pagination */}
          <div className='bg-white p-6 rounded-xl shadow-lg w-full max-w-7xl'>
            {isLoading && (
              <div className='text-center py-4 text-blue-600'>
                <p>Loading documents...</p>
              </div>
            )}

            {isError &&
              toast.error('Error fetching document. Please try again')}

            {!isLoading && !isError && (
              <TableWithPagination data={data}></TableWithPagination>
            )}
          </div>
          {/* Floating Action Button */}
          <button
            onClick={() => setIsOpen(true)}
            className='fixed bottom-8  right-8 bg-black hover:bg-black-700 text-white rounded-full w-15 h-15 flex items-center justify-center shadow-lg transition-all z-50'
          >
            <span className='text-3xl font-bold'>+</span>
          </button>
          {/* Slide-in Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {/* Header */}
            <div className='flex justify-between items-center px-4 border-b'>
              <h2 className='text-lg font-semibold pt-6'>Upload Document</h2>
              <button
                onClick={() => setIsOpen(false)}
                className='text-gray-600 hover:text-gray-900'
              >
                ✕
              </button>
            </div>

            {/* Form Content */}
            <div className='p-4 overflow-y-auto h-full'>
              <UploadForm handleFormSubmit={handleSubmit} />
            </div>
          </div>
          {/* Backdrop */}
          {isOpen && (
            <div
              onClick={() => setIsOpen(false)}
              className='fixed inset-0 z-30'
            ></div>
          )}
        </div>
      </div>
    </div>
  );
}
