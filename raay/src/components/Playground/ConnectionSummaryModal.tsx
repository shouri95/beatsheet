// src/components/Playground/ConnectionsSummaryModal.tsx

"use client";

import React from 'react';
import { Modal } from '../UI/Modal';
import ConnectionsSummary from './ConnectionSummary';

interface ConnectionsSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionsSummaryModal: React.FC<ConnectionsSummaryModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connections Summary">
      <ConnectionsSummary />
    </Modal>
  );
};

export default ConnectionsSummaryModal;
