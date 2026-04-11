import React from 'react';

export const Stats = ({ totalDocuments, expieredDocs, expiringThisMonth }) => {
  return (
   <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
      <div>
        <div className='p-4 border-1 rounded-xl shadow-lg hover:shadow-lg transition text-white'>
          <p className='text-black font-bold text-sm'>Total uploaded</p>
          <h3 className='text-2xl font-bold text-gray-800 pt-2'>
            {totalDocuments}
          </h3>
        </div>
      </div>

      <div>
        <div className='p-4 border-1 rounded-xl shadow-lg hover:shadow-lg transition text-white'>
          <p className='text-md font-bold text-gray-800'>Expired</p>
          <h3 className='text-2xl font-bold text-gray-800 pt-2'>
            {expieredDocs}
          </h3>
        </div>
      </div>

      <div>
        <div className='p-4 border-1 rounded-xl shadow-lg hover:shadow-lg transition text-white'>
          <p className='text-md font-bold text-gray-800'>Expiring this month</p>
          <h3 className='text-2xl font-bold text-gray-800 pt-2'>
            {expiringThisMonth}
          </h3>
        </div>
      </div>
    </div>
  );
};
