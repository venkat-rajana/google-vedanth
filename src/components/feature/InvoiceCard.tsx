import React from 'react';
import { Invoice, Appointment, User } from '../../types';
import { format } from 'date-fns';
import { FileText, Download, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { exportService } from '../../services/exportService';
import { useToast } from '../ui/Toast';

interface InvoiceCardProps {
  invoice: Invoice;
  appointment: Appointment;
  patient: User;
  doctor: User;
  onUpdateStatus?: (id: string, status: 'paid' | 'waived') => void;
}

export function InvoiceCard({ invoice, appointment, patient, doctor, onUpdateStatus }: InvoiceCardProps) {
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      await exportService.generatePDF(`invoice-${invoice.id}`, `Invoice_${invoice.id}.pdf`);
      toast('Invoice downloaded successfully', 'success');
    } catch (error: any) {
      toast(error.message || 'Failed to download invoice', 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Invoice #{invoice.id.substring(0, 8).toUpperCase()}</h3>
            <p className="text-sm text-gray-500">{format(new Date(invoice.generatedAt), 'MMM d, yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === 'pending' && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3" /> Pending</span>}
          {invoice.status === 'paid' && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Paid</span>}
          {invoice.status === 'waived' && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Waived</span>}
        </div>
      </div>
      
      <div className="p-4 flex-1" id={`invoice-${invoice.id}`}>
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900">Billed To:</p>
          <p className="text-sm text-gray-600">{patient.name}</p>
          {patient.email && <p className="text-sm text-gray-500">{patient.email}</p>}
        </div>
        
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900">Service Details:</p>
          <p className="text-sm text-gray-600">Consultation with {doctor.name}</p>
          <p className="text-sm text-gray-500">{format(new Date(appointment.date), 'MMM d, yyyy')} • {appointment.startTime} ({appointment.duration} min)</p>
        </div>

        <div className="border-t border-gray-100 pt-4 mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-2 text-gray-900">{item.description}</td>
                  <td className="py-2 text-right text-gray-900">${item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="pt-3 font-semibold text-gray-900">Total</td>
                <td className="pt-3 font-semibold text-right text-teal-600 text-lg">${invoice.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
        
        {onUpdateStatus && invoice.status === 'pending' && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onUpdateStatus(invoice.id, 'waived')} className="text-gray-500 hover:text-gray-900">
              Waive
            </Button>
            <Button variant="default" size="sm" onClick={() => onUpdateStatus(invoice.id, 'paid')} className="bg-teal-600 hover:bg-teal-700 text-white">
              Mark Paid
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
