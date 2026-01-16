import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { contactInfo } from './data';

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContactModal = memo(function ContactModal({
  open,
  onOpenChange,
}: ContactModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" dir="rtl">
            د اړیکو معلومات
          </DialogTitle>
          <DialogDescription dir="rtl">
            د لا زیاتو معلوماتو یا نورو ځانګړتیاوو په اړه د معلوماتو لپاره اړیکه ونیسئ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {contactInfo.map((contact) => (
            <div
              key={contact.type}
              className="p-6 border-2 border-[#f0e6b3] rounded-xl bg-gradient-to-br from-[#f8fafc] to-white hover:shadow-md transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 text-[#0b0b56]">
                  {contact.type === 'whatsapp' && (
                    <svg
                      className="w-6 h-6 text-emerald-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.52 3.48A11.94 11.94 0 0012.04 0C5.46 0 0 5.37 0 12c0 2.11.55 4.18 1.6 6.01L0 24l6.15-1.6A12 12 0 1012.04 0h-.02zm0 0" />
                      <path
                        fill="#fff"
                        d="M17.47 14.2c-.26-.13-1.53-.75-1.77-.83-.24-.08-.41-.13-.58.13-.17.26-.67.83-.82 1-.15.17-.3.2-.56.07-.26-.13-1.09-.4-2.08-1.27-.77-.68-1.29-1.52-1.45-1.78-.15-.26-.02-.4.11-.53.11-.11.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.32-.02-.45-.06-.13-.58-1.39-.79-1.9-.21-.5-.42-.43-.58-.44h-.5c-.17 0-.45.06-.68.32-.23.26-.89.87-.89 2.12s.91 2.46 1.04 2.63c.13.17 1.78 2.71 4.3 3.7.6.26 1.07.41 1.44.52.61.19 1.17.16 1.61.1.49-.08 1.53-.63 1.75-1.24.22-.61.22-1.12.15-1.24-.06-.12-.24-.19-.5-.32z"
                      />
                    </svg>
                  )}
                  {contact.type === 'website' && (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M2.5 12h19" />
                      <path d="M12 3c2.8 2.6 4.1 5.6 4.1 9s-1.3 6.4-4.1 9c-2.8-2.6-4.1-5.6-4.1-9s1.3-6.4 4.1-9z" />
                    </svg>
                  )}
                  {contact.type === 'twitter' && (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2H21l-6.5 7.43L22.5 22H15.9l-5.03-6.61L4.97 22H2.21l6.97-7.97L1.5 2h6.75l4.53 6L18.244 2Zm-2.35 18h1.83L8.2 4h-1.8l9.494 16Z" />
                    </svg>
                  )}
                </div>
                <span className="text-lg font-bold text-[#0b0b56]" dir="rtl">
                  {contact.label}
                </span>
              </div>
              <div className="text-base text-slate-700">
                <a
                  href={contact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0b0b56] font-semibold hover:text-[#c9a44d] transition-colors inline-flex items-center gap-2"
                >
                  <span>{contact.value}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
});
