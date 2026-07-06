import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Login } from './auth/login';
import { SignUp } from './auth/sign-up';
import { HomePage } from './home/home';
import { ResetPassword } from './auth/reset-password';
import { Toaster } from 'react-hot-toast';
import { UpdateModal } from './update-modal';
import { AppVersion } from './app-version';
import React from 'react';

export const App = () => {
  return (
    <Router>
      <Toaster position='top-right' />
      <UpdateModal />
      <AppVersion />
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/signup' element={<SignUp />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='/home' element={<HomePage />} />
        <Route path='*' element={<Login />} />
      </Routes>
    </Router>
  );
};
