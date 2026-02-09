import React, { useMemo, useEffect } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import { formatDate as formatDateUtil } from '@/lib/utils';
import type { Student } from '@/types/domain/student';
import type { SchoolAdmissionRules } from '@/types/domain/schoolAdmissionRules';

interface StudentProfilePrintProps {
  student: Student;
  schoolName: string | null;
  pictureUrl: string | null;
  guardianPictureUrl: string | null;
  isRTL: boolean;
  schoolAdmissionRules?: SchoolAdmissionRules | null;
}

export function StudentProfilePrint({
  student,
  schoolName,
  pictureUrl,
  guardianPictureUrl,
  isRTL,
  schoolAdmissionRules,
}: StudentProfilePrintProps) {
  const { t } = useLanguage();
  // Inject print styles
  useEffect(() => {
    const styleId = 'student-profile-print-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // Screen styles - hide print layout
    const screenStyleId = 'student-profile-screen-styles';
    let screenStyleElement = document.getElementById(screenStyleId) as HTMLStyleElement;
    
    if (!screenStyleElement) {
      screenStyleElement = document.createElement('style');
      screenStyleElement.id = screenStyleId;
      document.head.appendChild(screenStyleElement);
    }

    screenStyleElement.textContent = `
      .student-profile-print-layout {
        display: none !important;
      }
    `;

    styleElement.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 15mm;
        }

        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          margin: 0;
          background: #fff !important;
        }

        /* Hide dialog and screen content */
        [data-radix-dialog-overlay],
        [data-radix-dialog-content] > *:not(.student-profile-print-layout),
        .student-profile-screen,
        .no-print {
          display: none !important;
        }

        /* Ensure print layout is displayed and positioned */
        .student-profile-print-layout {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          font-family: "Bahij Nassim", "Inter", sans-serif !important;
          color: #0b0b56 !important;
          line-height: 1.4 !important;
          font-size: 10.5pt !important;
          direction: ${isRTL ? 'rtl' : 'ltr'} !important;
          text-align: ${isRTL ? 'right' : 'left'} !important;
          visibility: visible !important;
        }

        /* Make sure all children of print layout are visible */
        .student-profile-print-layout * {
          visibility: visible !important;
        }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }

        .student-profile-print-layout .print-title {
          text-align: center;
          font-size: 20pt;
          font-weight: 700;
          margin: 8px 0 16px;
          color: #0b0b56;
        }

        .student-profile-print-layout .print-section {
          border-top: 1px solid #e0e0e0;
          padding: 12px 0;
          margin-bottom: 0;
          background-color: transparent;
          page-break-inside: avoid;
        }

        .student-profile-print-layout .print-section:first-of-type {
          border-top: none;
        }

        .student-profile-print-layout .print-page-info {
          page-break-after: always;
        }

        .student-profile-print-layout .print-header-section {
          border-top: none;
          padding-bottom: 16px;
          margin-bottom: 12px;
        }

        .student-profile-print-layout .print-section-title {
          font-size: 13pt;
          font-weight: 600;
          margin-bottom: 10px;
          color: #14146f;
          padding-bottom: 6px;
          border-bottom: 1px solid #e0e0e0;
        }

        .student-profile-print-layout table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
          table-layout: auto;
        }

        .student-profile-print-layout table tr {
          page-break-inside: avoid;
        }

        .student-profile-print-layout td {
          padding: 6px 8px;
          vertical-align: middle;
          font-size: 10pt;
          word-wrap: break-word;
          border: none;
        }

        .student-profile-print-layout td.print-label {
          width: 140px;
          font-weight: 600;
          color: #0b0b56;
          white-space: nowrap;
          text-align: ${isRTL ? 'right' : 'left'};
          padding-right: ${isRTL ? '12px' : '8px'};
          padding-left: ${isRTL ? '8px' : '12px'};
        }

        .student-profile-print-layout td.print-value {
          min-height: 22px;
          text-align: ${isRTL ? 'right' : 'left'};
          padding: 6px 8px;
          vertical-align: middle;
          font-size: 10.5pt;
          color: #000;
        }
        
        .student-profile-print-layout td.print-value:empty::after {
          content: ' ';
          display: inline-block;
          width: 100%;
        }

        .student-profile-print-layout .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0;
        }

        .student-profile-print-layout .header-photo-cell {
          width: 35mm;
          padding: 8px;
          text-align: center;
          vertical-align: middle;
        }

        .student-profile-print-layout .header-photo-cell .photo,
        .student-profile-print-layout .header-photo-cell .photo-placeholder {
          width: 32mm;
          height: 40mm;
          margin: 0 auto;
          display: block;
        }

        .student-profile-print-layout .header-info-cell {
          padding: 8px 16px;
          text-align: center;
          vertical-align: middle;
        }

        .student-profile-print-layout .header-info {
          text-align: center;
        }

        .student-profile-print-layout .header-name {
          font-size: 16pt;
          font-weight: 700;
          color: #0b0b56;
          margin-bottom: 4px;
        }

        .student-profile-print-layout .header-subtitle {
          font-size: 12pt;
          color: #555;
          margin-bottom: 4px;
        }

        .student-profile-print-layout .header-id {
          font-size: 10pt;
          color: #777;
        }

        .student-profile-print-layout .photo-label {
          font-size: 9pt;
          font-weight: 600;
          color: #0b0b56;
          margin-top: 6px;
          text-align: center;
        }

        .student-profile-print-layout .photo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border: 1px solid #0b0b56;
        }

        .student-profile-print-layout .photo-placeholder {
          width: 100%;
          height: 100%;
          border: 1px solid #ddd;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 9pt;
          background-color: #f9f9f9;
        }

        .student-profile-print-layout .blue-title {
          font-size: 13pt;
          font-weight: 600;
          color: #14146f;
          margin-bottom: 8px;
        }

        .student-profile-print-layout .signature-line {
          border-bottom: 1px solid #999;
          width: 150px;
          display: inline-block;
          height: 18px;
          margin: 0 8px;
        }

        .student-profile-print-layout .stamp-box {
          border: 1px solid #aaa;
          width: 90px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #999;
          font-size: 9pt;
        }

        .student-profile-print-layout ul {
          margin: 4px 0 0;
          padding-${isRTL ? 'right' : 'left'}: 18px;
          font-size: 10pt;
        }

        .student-profile-print-layout li {
          margin-bottom: 4px;
        }

        .student-profile-print-layout .page-break {
          page-break-before: always;
        }

        /* Second page: Rules (Commitments, Guarantee, Approval) - full page design */
        .student-profile-print-layout .print-page-rules {
          page-break-before: always;
          min-height: 257mm;
          padding: 0 5mm;
          box-sizing: border-box;
        }

        .student-profile-print-layout .print-page-rules .print-rules-title {
          text-align: center;
          font-size: 18pt;
          font-weight: 700;
          margin: 0 0 20px;
          color: #0b0b56;
          padding-bottom: 12px;
          border-bottom: 2px solid #0b0b56;
        }

        .student-profile-print-layout .print-rules-section {
          margin-bottom: 22px;
          page-break-inside: avoid;
        }

        .student-profile-print-layout .print-rules-section-title {
          font-size: 13pt;
          font-weight: 700;
          color: #14146f;
          margin-bottom: 10px;
          padding-bottom: 4px;
          border-bottom: 1px solid #c4c4e0;
        }

        .student-profile-print-layout .print-rules-list {
          margin: 0;
          padding-${isRTL ? 'right' : 'left'}: 22px;
          padding-${isRTL ? 'left' : 'right'}: 0;
          font-size: 11pt;
          line-height: 1.6;
        }

        .student-profile-print-layout .print-rules-list li {
          margin-bottom: 8px;
        }

        .student-profile-print-layout .print-rules-guarantee-text {
          font-size: 11pt;
          line-height: 1.65;
          text-align: ${isRTL ? 'right' : 'left'};
          margin: 0 0 12px;
        }

        .student-profile-print-layout .print-rules-signature-row {
          margin-top: 14px;
          font-size: 10.5pt;
        }

        .student-profile-print-layout .print-rules-signature-line {
          border-bottom: 1px solid #333;
          min-width: 120px;
          display: inline-block;
          height: 20px;
          margin: 0 6px;
          vertical-align: middle;
        }

        .student-profile-print-layout .print-rules-approval-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11pt;
          margin-top: 8px;
        }

        .student-profile-print-layout .print-rules-approval-table td {
          padding: 10px 8px;
          vertical-align: middle;
          border: none;
        }

        .student-profile-print-layout .print-rules-stamp-box {
          border: 1.5px solid #666;
          width: 85px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #555;
          font-size: 9pt;
          vertical-align: middle;
        }

        .student-profile-print-layout .print-rules-footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #e0e0e0;
          font-size: 9pt;
          color: #666;
          text-align: center;
        }
      }
    `;

    return () => {
      // Cleanup on unmount
      const style = document.getElementById(styleId);
      if (style) {
        style.remove();
      }
      const screenStyle = document.getElementById(screenStyleId);
      if (screenStyle) {
        screenStyle.remove();
      }
    };
  }, [isRTL]);

  const printText = useMemo(() => {
    return {
      title: t('students.printTitle') || (isRTL ? 'د زده کوونکي انفرادي معلومات' : 'Student Personal Information'),
      personal: t('students.personalInfo') || 'Personal Information',
      admissionSection: t('students.admissionInfo') || 'Admission Information',
      addressSection: t('students.addressInfo') || 'Address Information',
      guardianSection: t('students.guardianInfo') || 'Guardian Information',
      otherInfo: t('students.otherInfo') || 'Other Information',
      name: t('events.name') || 'Name',
      fatherName: t('examReports.fatherName') || 'Father Name',
      grandfatherName: t('students.grandfatherName') || 'Grandfather Name',
      birthYear: t('students.birthYear') || 'Birth Year',
      tazkiraNumber: t('students.tazkiraNumber') || 'Tazkira Number',
      idNumber: t('students.idNumber') || 'ID Number',
      cardNumber: t('attendanceReports.cardNumber') || 'Card Number',
      admissionNo: t('examReports.admissionNo') || 'Admission No',
      admissionYear: t('students.admissionYear') || 'Admission Year',
      applyingGrade: t('students.applyingGrade') || 'Applying Grade',
      schoolLabel: t('students.school') || 'School',
      originProvince: t('students.originProvince') || 'Origin Province',
      originDistrict: t('students.originDistrict') || 'Origin District',
      originVillage: t('students.originVillage') || 'Origin Village',
      currentProvince: t('students.currentProvince') || 'Current Province',
      currentDistrict: t('students.currentDistrict') || 'Current District',
      currentVillage: t('students.currentVillage') || 'Current Village',
      homeAddress: t('students.homeAddress') || 'Home Address',
      guardianName: t('students.guardianName') || 'Guardian Name',
      guardianRelation: t('students.relation') || 'Relation',
      guardianPhone: t('events.phone') || 'Phone',
      guardianTazkira: t('students.guardianTazkira') || 'National ID',
      guarantorName: t('students.zaminName') || 'Guarantor Name',
      guarantorPhone: t('students.zaminPhone') || 'Guarantor Phone',
      guarantorTazkira: t('students.zaminTazkira') || 'Guarantor ID',
      guarantorAddress: t('students.zaminAddress') || 'Guarantor Address',
      isOrphan: t('students.orphanStatus') || 'Is Orphan?',
      feeStatus: t('students.admissionFeeStatus') || 'Fee Status',
      createdAt: t('events.createdAt') || 'Created At',
      updatedAt: t('events.updatedAt') || 'Updated At',
      guardianLabel: t('students.guardian') || 'Guardian',
      studentLabel: t('students.student') || 'Student',
      yes: t('events.yes') || 'Yes',
      no: t('events.no') || 'No',
      commitmentsTitle: t('students.commitmentsTitle') || 'Commitments, Guarantee & Approval',
      commitmentTitle: t('students.commitmentTitle') || 'Commitment',
      guaranteeTitle: t('students.guaranteeTitle') || 'Guarantee',
      approvalTitle: t('students.approvalTitle') || 'Approval',
      // Use school-specific rules if provided, otherwise fallback to translations
      commitmentText: schoolAdmissionRules?.commitmentItems && schoolAdmissionRules.commitmentItems.length > 0
        ? schoolAdmissionRules.commitmentItems
        : [
            t('students.commitmentText1') || 'I will follow all school rules',
            t('students.commitmentText2') || 'I will follow Islamic laws in addition to school rules',
            t('students.commitmentText3') || 'I will respect all teachers and staff and protect school property',
            t('students.commitmentText4') || 'I accept any decision by the administration for violations or absences',
            t('students.commitmentText5') || 'I will follow school rules regarding mobile phones, and the school has the right to expel me or confiscate my phone if I violate.',
            t('students.commitmentText6') || 'I authorize the school principal or deputy to act on my behalf in zakat, charity, and similar charitable activities',
          ],
      guaranteeText: schoolAdmissionRules?.guaranteeText && schoolAdmissionRules.guaranteeText.trim()
        ? schoolAdmissionRules.guaranteeText
        : (t('students.guaranteeText') || 'The mentioned conditions and regulations are correct according to my knowledge; therefore, I am satisfied with admission to the school and guarantee that the mentioned student will abide by all school rules, and any decision by the school in case of violation is acceptable to me.'),
      approvalText: {
        admission: t('students.approvalAdmission') || 'The mentioned student was admitted to grade',
        fee: t('students.approvalFee') || 'Admission Fee:',
        date: t('students.approvalDate') || 'Admission Date:',
        signature: t('students.approvalSignature') || 'Administrator Signature:',
        stamp: t('students.approvalStamp') || 'Stamp',
      },
    };
  }, [isRTL, t, schoolAdmissionRules]);

  const displayValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value).trim();
  };

  const boolToText = (value?: boolean | null) => (value ? printText.yes : printText.no);

  const formatDateValue = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return formatDateUtil(date);
  };

  return (
    <div className="student-profile-print-layout" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page 1: Student information */}
      <div className="print-page-info">
        <div className="print-title">{printText.title}</div>

        {/* Header Row with Photos */}
      <div className="print-section print-header-section">
        <table className="header-table">
          <tbody>
            <tr>
              <td className="header-photo-cell">
                {guardianPictureUrl ? (
                  <img className="photo" src={guardianPictureUrl} alt="Guardian" />
                ) : (
                  <div className="photo-placeholder">{printText.guardianLabel}</div>
                )}
                <div className="photo-label">{printText.guardianLabel}</div>
              </td>
              <td className="header-info-cell">
                <div className="header-info">
                  <div className="header-name">{displayValue(student.full_name)}</div>
                  <div className="header-subtitle">
                    {displayValue(student.father_name)}
                    {student.grandfather_name && ` ${displayValue(student.grandfather_name)}`}
                  </div>
                  <div className="header-id">{printText.idNumber}: {displayValue(student.admission_no)}</div>
                </div>
              </td>
              <td className="header-photo-cell">
                {pictureUrl ? (
                  <img className="photo" src={pictureUrl} alt="Student" />
                ) : (
                  <div className="photo-placeholder">{printText.studentLabel}</div>
                )}
                <div className="photo-label">{printText.studentLabel}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Personal Information */}
      <div className="print-section">
        <div className="print-section-title">{printText.personal}</div>
        <table>
          <tbody>
            <tr>
              <td className="print-label">{printText.name}</td>
              <td className="print-value">{displayValue(student.full_name)}</td>
              <td className="print-label">{printText.fatherName}</td>
              <td className="print-value">{displayValue(student.father_name)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.grandfatherName}</td>
              <td className="print-value">{displayValue(student.grandfather_name)}</td>
              <td className="print-label">{printText.birthYear}</td>
              <td className="print-value">{displayValue(student.birth_year)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.tazkiraNumber}</td>
              <td className="print-value">{displayValue(student.tazkiraNumber)}</td>
              <td className="print-label">{t('students.phone') || 'Phone'}</td>
              <td className="print-value">{displayValue(student.phone)}</td>
            </tr>
            <tr>
              <td className="print-label">{t('students.birthDate') || 'Birth Date'}</td>
              <td className="print-value">{displayValue(student.birthDate)}</td>
              <td className="print-label"></td>
              <td className="print-value"></td>
            </tr>
            {student.mother_name && (
              <tr>
                <td className="print-label">{t('studentReportCard.motherName') || 'Mother Name'}</td>
                <td className="print-value">{displayValue(student.mother_name)}</td>
                <td className="print-label">{t('students.gender') || 'Gender'}</td>
                <td className="print-value">{student.gender === 'male' ? t('students.male') : t('students.female')}</td>
              </tr>
            )}
            {!student.mother_name && (
              <tr>
                <td className="print-label">{t('students.gender') || 'Gender'}</td>
                <td className="print-value">{student.gender === 'male' ? t('students.male') : t('students.female')}</td>
                <td className="print-label"></td>
                <td className="print-value"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Admission Information */}
      <div className="print-section">
        <div className="print-section-title">{printText.admissionSection}</div>
        <table>
          <tbody>
            <tr>
              <td className="print-label">{printText.cardNumber}</td>
              <td className="print-value">{displayValue(student.card_number)}</td>
              <td className="print-label">{printText.admissionNo}</td>
              <td className="print-value">{displayValue(student.admission_no)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.admissionYear}</td>
              <td className="print-value">{displayValue(student.admission_year)}</td>
              <td className="print-label">{printText.applyingGrade}</td>
              <td className="print-value">{displayValue(student.applying_grade)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.schoolLabel}</td>
              <td className="print-value" colSpan={3}>{displayValue(schoolName)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Address Information */}
      <div className="print-section">
        <div className="print-section-title">{printText.addressSection}</div>
        <table>
          <tbody>
            <tr>
              <td className="print-label">{printText.originProvince}</td>
              <td className="print-value">{displayValue(student.orig_province)}</td>
              <td className="print-label">{printText.originDistrict}</td>
              <td className="print-value">{displayValue(student.orig_district)}</td>
              <td className="print-label">{printText.originVillage}</td>
              <td className="print-value">{displayValue(student.orig_village)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.currentProvince}</td>
              <td className="print-value">{displayValue(student.curr_province)}</td>
              <td className="print-label">{printText.currentDistrict}</td>
              <td className="print-value">{displayValue(student.curr_district)}</td>
              <td className="print-label">{printText.currentVillage}</td>
              <td className="print-value">{displayValue(student.curr_village)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.homeAddress}</td>
              <td className="print-value" colSpan={5}>{displayValue(student.home_address)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Guardian Information */}
      <div className="print-section">
        <div className="print-section-title">{printText.guardianSection}</div>
        <table>
          <tbody>
            <tr>
              <td className="print-label">{printText.guardianName}</td>
              <td className="print-value">{displayValue(student.guardian_name)}</td>
              <td className="print-label">{printText.guardianRelation}</td>
              <td className="print-value">{displayValue(student.guardian_relation)}</td>
              <td className="print-label">{printText.guardianPhone}</td>
              <td className="print-value">{displayValue(student.guardian_phone)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.guardianTazkira}</td>
              <td className="print-value">{displayValue(student.guardian_tazkira)}</td>
              <td className="print-label">{printText.guarantorName}</td>
              <td className="print-value">{displayValue(student.zamin_name)}</td>
              <td className="print-label">{printText.guarantorPhone}</td>
              <td className="print-value">{displayValue(student.zamin_phone)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.guarantorTazkira}</td>
              <td className="print-value">{displayValue(student.zamin_tazkira)}</td>
              <td className="print-label">{printText.guarantorAddress}</td>
              <td className="print-value" colSpan={3}>{displayValue(student.zamin_address)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Other Information */}
      <div className="print-section">
        <div className="print-section-title">{printText.otherInfo}</div>
        <table>
          <tbody>
            <tr>
              <td className="print-label">{printText.isOrphan}</td>
              <td className="print-value">{boolToText(student.is_orphan)}</td>
              <td className="print-label">{printText.feeStatus}</td>
              <td className="print-value">{displayValue(student.admission_fee_status)}</td>
            </tr>
            <tr>
              <td className="print-label">{printText.createdAt}</td>
              <td className="print-value">{formatDateValue(student.created_at)}</td>
              <td className="print-label">{printText.updatedAt}</td>
              <td className="print-value">{formatDateValue(student.updated_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {student.notes && (
        <div className="print-section">
          <div className="print-section-title">{t('students.notes') || 'Notes'}</div>
          <div style={{ fontSize: '12pt', whiteSpace: 'pre-wrap' }}>{student.notes}</div>
        </div>
      )}
      </div>

      {/* Page 2: Commitments, Guarantee, and Approval (school rules) */}
      <div className="print-page-rules">
        <h1 className="print-rules-title">{printText.commitmentsTitle}</h1>

        {/* Commitment (تعهد نامه) */}
        <div className="print-rules-section">
          <div className="print-rules-section-title">{printText.commitmentTitle}</div>
          <ul className="print-rules-list">
            {printText.commitmentText.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
          <div className="print-rules-signature-row">
            {t('events.signature') || 'Signature'}: <span className="print-rules-signature-line" />
          </div>
        </div>

        {/* Guarantee (ضمانت نامه) */}
        <div className="print-rules-section">
          <div className="print-rules-section-title">{printText.guaranteeTitle}</div>
          <p className="print-rules-guarantee-text">{printText.guaranteeText}</p>
          <div className="print-rules-signature-row">
            {t('students.guarantorSignature') || 'Guarantor Signature'}: <span className="print-rules-signature-line" />
          </div>
        </div>

        {/* Approval (تائيد نامه) */}
        <div className="print-rules-section">
          <div className="print-rules-section-title">{printText.approvalTitle}</div>
          <table className="print-rules-approval-table">
            <tbody>
              <tr>
                <td style={{ width: isRTL ? '48%' : '52%', textAlign: isRTL ? 'right' : 'left' }}>
                  {printText.approvalText.admission}
                  <span className="print-rules-signature-line" style={{ width: '100px' }} />
                  {t('students.wasAdmitted') || 'was admitted.'}
                </td>
                <td style={{ width: isRTL ? '52%' : '48%' }} />
              </tr>
              <tr>
                <td style={{ textAlign: isRTL ? 'right' : 'left', paddingTop: '14px' }}>
                  {printText.approvalText.fee}
                  <span className="print-rules-signature-line" style={{ width: '130px' }} />
                </td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: isRTL ? 'right' : 'left', paddingTop: '14px' }}>
                  {printText.approvalText.date}
                  <span className="print-rules-signature-line" style={{ width: '120px' }} />
                </td>
                <td />
              </tr>
              <tr>
                <td style={{ textAlign: isRTL ? 'right' : 'left', paddingTop: '14px' }}>
                  {printText.approvalText.signature}
                  <span className="print-rules-signature-line" style={{ width: '110px' }} />
                </td>
                <td style={{ textAlign: isRTL ? 'right' : 'left', paddingTop: '14px' }}>
                  {t('students.stamp') || 'Stamp'}: <span className="print-rules-stamp-box">{printText.approvalText.stamp}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="print-rules-footer">
          {schoolName && <span>{schoolName}</span>}
          {schoolName && ' · '}
          {printText.title} — {printText.commitmentsTitle}
        </div>
      </div>
    </div>
  );
}
