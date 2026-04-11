import React from 'react';
import { formatDate } from './table';

export const WarningCards = ({ documents }) => {
  return (
    <div className='p-4'>
      <h2 className='text-lg font-semibold mb-3'>Expiring within next 30 days</h2>

      <div className='flex space-x-4 overflow-x-auto pb-2'>
        {documents.length > 0 ? (
          documents.map((doc) => (
            <div
              key={doc.id}
              className='min-w-[220px] flex-shrink-0 rounded-xl p-4 border-1 border-black hover:shadow-lg transition text-white'
              //   style={{ backgroundColor: '#f7ab31ff' }}
            >
              <h3 className='text-md font-bold text-gray-800'>
                {doc.documentType}
              </h3>
              <p className='text-sm text-gray-500'>
                Vehicle plate no:{' '}
                <span className='font-medium text-black'>
                  {doc.vehicleNumber}
                </span>
              </p>
              <p className='text-sm text-gray-500'>
                Expiry:{' '}
                <span className='font-medium text-red-600'>
                  {formatDate(doc.expirationDate)}
                </span>
              </p>
            </div>
          ))
        ) : (
          <p className='text-gray-500'>No documents expiring soon 🎉</p>
        )}
      </div>
    </div>
  );
};

// {
//     "id": 13,
//     "vehicleNumber": "GJ-21-VE-7562",
//     "vehicleType": "car",
//     "issueDate": "2025-09-20T00:00:00.000Z",
//     "expirationDate": "2025-10-22T00:00:00.000Z",
//     "documentType": "insurance",
//     "userId": 1,
//     "createdAt": "2025-09-13T07:10:07.386Z",
//     "updatedAt": "2025-09-13T07:10:07.386Z"
// }
