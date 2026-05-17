import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './auth/login';
import { SignUp } from './auth/sign-up';
import { HomePage } from './home/home';
import { ResetPassword } from './auth/reset-password';
import { Toaster } from 'react-hot-toast';
import { UpdateModal } from './update-modal';
import React from 'react';
import { ActivationGate } from './license/activation-gate';

export const App = () => {
  return (
    <ActivationGate>
      <Router>
        <Toaster position='top-right' />
        <UpdateModal />
        <Routes>
          <Route path='/' element={<Login />} />
          <Route path='/signup' element={<SignUp />} />
          <Route path='/reset-password' element={<ResetPassword />} />
          <Route path='/home' element={<HomePage />} />
          <Route path='*' element={<Login />} />
        </Routes>
      </Router>
    </ActivationGate>
  );
};
