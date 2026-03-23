import Modal from './Modal';

export default function ConfirmModal({ title = 'Are you sure?', message, confirmLabel = 'Confirm', confirmClass = 'btn-danger', onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ color: 'var(--gray-300)', marginBottom: 0 }}>{message}</p>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${confirmClass}`} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function AlertModal({ title = 'Notice', message, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ color: 'var(--gray-300)', marginBottom: 0 }}>{message}</p>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>OK</button>
      </div>
    </Modal>
  );
}