import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientDetail } from './pages/PatientDetail';
import { BilanEditor } from './pages/BilanEditor';
import { BilanApercu } from './pages/BilanApercu';
import { Modeles } from './pages/Modeles';
import { Bibliotheque } from './pages/Bibliotheque';
import { ModeleEditor } from './pages/ModeleEditor';
import { CabinetPage } from './pages/CabinetPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:id" element={<PatientDetail />} />
          <Route path="bilans/:id" element={<BilanEditor />} />
          <Route path="bilans/:id/apercu" element={<BilanApercu />} />
          <Route path="modeles" element={<Modeles />} />
          <Route path="modeles/:id" element={<ModeleEditor />} />
          <Route path="cabinet" element={<CabinetPage />} />
          <Route path="bibliotheque" element={<Bibliotheque />} />
          <Route path="*" element={<div className="page">Page introuvable.</div>} />
        </Route>
      </Routes>
    </HashRouter>
  </StrictMode>,
);
