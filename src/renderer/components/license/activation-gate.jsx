import React, { useEffect, useState } from 'react';
import { useLicenseStatus } from '../../hooks/useLicenseStatus';

const helpTextByReason = {
  'missing-license': 'Upload your docalert.license file to unlock DocAlert on this device.',
  'invalid-license': 'This license file is invalid. Please choose the correct file or contact support.',
  'device-mismatch': 'This license was issued for a different device. Please contact support if you need help.',
  expired: 'This license has expired. Renew your license and upload the latest file.',
  'cannot-connect': 'Cannot connect to the license server. Please check your connection and try again.',
  unknown: 'We could not validate this license yet. Please try again or contact support.',
};

const StatusCopy = ({ status }) => {
  if (status.state === 'checking') {
    return (
      <>
        <h2 className='text-3xl font-semibold text-gray-900'>Checking your license</h2>
        <p className='mt-3 text-sm leading-6 text-gray-600'>
          DocAlert is validating this installation before we let the app continue.
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className='text-3xl font-semibold text-gray-900'>Activate DocAlert</h2>
      <p className='mt-3 text-sm leading-6 text-gray-600'>
        {helpTextByReason[status.reason] || helpTextByReason.unknown}
      </p>
    </>
  );
};

export const ActivationGate = ({ children }) => {
  const { status, ipcRenderer } = useLicenseStatus();
  const [manualKey, setManualKey] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [machineFileMessage, setMachineFileMessage] = useState('');

  useEffect(() => {
    if (status.state === 'locked') {
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('userName');
    }
  }, [status.state]);

  if (status.state === 'unlocked') {
    return children;
  }

  const runAction = async (actionName, work) => {
    setBusyAction(actionName);
    setInlineError('');

    try {
      await work();
    } catch (error) {
      setInlineError(error?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusyAction('');
    }
  };

  const uploadLicenseFile = async () => {
    if (!ipcRenderer) return;
    const nextStatus = await ipcRenderer.invoke('license:activate-file');
    if (nextStatus?.state === 'locked' && nextStatus?.message) {
      setInlineError(nextStatus.message);
    }
  };

  const activateManualKey = async () => {
    if (!ipcRenderer || !manualKey.trim()) return;
    const nextStatus = await ipcRenderer.invoke('license:activate-manual', manualKey.trim());
    if (nextStatus?.state === 'locked' && nextStatus?.message) {
      setInlineError(nextStatus.message);
    }
  };

  const exportMachineRequest = async () => {
    if (!ipcRenderer) return;
    const result = await ipcRenderer.invoke('license:export-machine-request');
    if (result?.success) {
      setMachineFileMessage(`Machine request saved to ${result.path}`);
    }
  };

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_#f3f4f6,_#e5e7eb_45%,_#d1d5db)] px-6 py-10 text-gray-900'>
      <div className='mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center'>
        <div className='grid w-full gap-8 rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur xl:grid-cols-[1.05fr_0.95fr]'>
          <section className='rounded-[28px] bg-slate-950 px-8 py-10 text-white'>
            <span className='inline-flex rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300'>
              Device Activation
            </span>
            <StatusCopy status={status} />

            <div className='mt-8 space-y-4 text-sm leading-6 text-slate-300'>
              <p>1. Buy or renew your license on the DocAlert website.</p>
              <p>2. Upload the returned <code className='rounded bg-white/10 px-1.5 py-0.5 text-slate-100'>docalert.license</code> file here.</p>
              <p>DocAlert revalidates this device every 24 hours. If validation fails, the app locks immediately.</p>
            </div>

            {/* Device-bound purchase flow is temporarily disabled. */}
            {/* <div className='mt-8 flex flex-wrap gap-3'>
              <button
                className='rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200'
                onClick={() => runAction('machine-file', exportMachineRequest)}
                disabled={busyAction !== ''}
              >
                {busyAction === 'machine-file' ? 'Saving machine file...' : 'Export machine request'}
              </button>
              <button
                className='rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10'
                onClick={() => ipcRenderer?.invoke('license:open-purchase-page')}
                disabled={busyAction !== ''}
              >
                Open purchase page
              </button>
            </div> */}

            {/* {machineFileMessage ? (
              <p className='mt-4 text-sm text-emerald-300'>{machineFileMessage}</p>
            ) : null} */}

            <div className='mt-10 rounded-3xl border border-white/10 bg-white/5 p-5'>
              <p className='text-xs uppercase tracking-[0.24em] text-slate-400'>Support</p>
              <p className='mt-3 text-sm text-slate-300'>
                If the uploaded license file fails or this device has changed, contact support for help with reissuing a license.
              </p>
              <button
                className='mt-4 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10'
                onClick={() => ipcRenderer?.invoke('license:contact-support')}
                disabled={busyAction !== ''}
              >
                Contact support
              </button>
            </div>
          </section>

          <section className='rounded-[28px] bg-white px-4 py-2'>
            <div className='rounded-[24px] border border-gray-200 bg-gray-50 p-7'>
              <p className='text-xs uppercase tracking-[0.24em] text-gray-500'>Unlock this installation</p>
              <h3 className='mt-3 text-2xl font-semibold text-gray-900'>Upload your license file</h3>
              <p className='mt-3 text-sm leading-6 text-gray-600'>
                We validate the uploaded file online before sign in and sign up become available.
              </p>

              <button
                className='mt-8 w-full rounded-2xl bg-black px-5 py-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={() => runAction('license-file', uploadLicenseFile)}
                disabled={busyAction !== '' || status.state === 'checking'}
              >
                {busyAction === 'license-file' ? 'Validating license...' : 'Choose docalert.license'}
              </button>

              <div className='my-8 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-gray-400'>
                <span className='h-px flex-1 bg-gray-200'></span>
                <span>Fallback</span>
                <span className='h-px flex-1 bg-gray-200'></span>
              </div>

              <label className='text-sm font-medium text-gray-700'>Paste a license key manually</label>
              <textarea
                className='mt-3 min-h-28 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-gray-400'
                placeholder='Paste the raw license key here if support asked you to.'
                value={manualKey}
                onChange={(event) => setManualKey(event.target.value)}
                disabled={busyAction !== '' || status.state === 'checking'}
              />

              <button
                className='mt-4 w-full rounded-2xl border border-gray-900 px-5 py-4 text-sm font-medium text-gray-900 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={() => runAction('manual-key', activateManualKey)}
                disabled={busyAction !== '' || !manualKey.trim() || status.state === 'checking'}
              >
                {busyAction === 'manual-key' ? 'Validating key...' : 'Validate pasted key'}
              </button>

              <button
                className='mt-4 w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={() => runAction('retry', async () => {
                  const nextStatus = await ipcRenderer?.invoke('license:retry-validation');
                  if (nextStatus?.state === 'locked' && nextStatus?.message) {
                    setInlineError(nextStatus.message);
                  }
                })}
                disabled={busyAction !== '' || status.state === 'checking'}
              >
                {busyAction === 'retry' ? 'Retrying...' : 'Retry validation'}
              </button>

              {(inlineError || status.message) ? (
                <div className='mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                  {inlineError || status.message}
                </div>
              ) : null}

              {status.activation?.lastValidatedAt ? (
                <p className='mt-5 text-xs text-gray-500'>
                  Last successful validation: {new Date(status.activation.lastValidatedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
