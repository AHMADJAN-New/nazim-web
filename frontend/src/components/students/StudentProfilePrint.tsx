import React, { useMemo, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Student } from '@/types/domain/student';
import { useLanguage } from '@/hooks/useLanguage';

interface StudentProfilePrintProps {
  student: Student;
  schoolName: string | null;
  pictureUrl: string | null;
  guardianPictureUrl: string | null;
  isRTL: boolean;
}

export function StudentProfilePrint({
  student,
  schoolName,
  pictureUrl,
  guardianPictureUrl,
  isRTL,
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
      name: t('students.name') || 'Name',
      fatherName: t('students.fatherName') || 'Father Name',
      grandfatherName: t('students.grandfatherName') || 'Grandfather Name',
      birthYear: t('students.birthYear') || 'Birth Year',
      tazkiraNumber: t('students.tazkiraNumber') || 'Tazkira Number',
      idNumber: t('students.idNumber') || 'ID Number',
      cardNumber: t('students.cardNumber') || 'Card Number',
      admissionNo: t('students.admissionNo') || 'Admission No',
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
      guardianPhone: t('students.phone') || 'Phone',
      guardianTazkira: t('students.guardianTazkira') || 'National ID',
      guarantorName: t('students.zaminName') || 'Guarantor Name',
      guarantorPhone: t('students.zaminPhone') || 'Guarantor Phone',
      guarantorTazkira: t('students.zaminTazkira') || 'Guarantor ID',
      guarantorAddress: t('students.zaminAddress') || 'Guarantor Address',
      isOrphan: t('students.orphanStatus') || 'Is Orphan?',
      feeStatus: t('students.admissionFeeStatus') || 'Fee Status',
      createdAt: t('students.createdAt') || 'Created At',
      updatedAt: t('students.updatedAt') || 'Updated At',
      guardianLabel: t('students.guardian') || 'Guardian',
      studentLabel: t('students.student') || 'Student',
      yes: t('common.yes') || 'Yes',
      no: t('common.no') || 'No',
      commitmentsTitle: t('students.commitmentsTitle') || 'Commitments, Guarantee & Approval',
      commitmentTitle: t('students.commitmentTitle') || 'Commitment',
      guaranteeTitle: t('students.guaranteeTitle') || 'Guarantee',
      approvalTitle: t('students.approvalTitle') || 'Approval',
      commitmentText: [
        t('students.commitmentText1') || 'I will follow all school rules',
        t('students.commitmentText2') || 'I will follow Islamic laws in addition to school rules',
        t('students.commitmentText3') || 'I will respect all teachers and staff and protect school property',
        t('students.commitmentText4') || 'I accept any decision by the administration for violations or absences',
        t('students.commitmentText5') || 'I will follow school rules regarding mobile phones, and the school has the right to expel me or confiscate my phone if I violate.',
        t('students.commitmentText6') || 'I authorize the school principal or deputy to act on my behalf in zakat, charity, and similar charitable activities',
      ],
      guaranteeText: t('students.guaranteeText') || 'The mentioned conditions and regulations are correct according to my knowledge; therefore, I am satisfied with admission to the school and guarantee that the mentioned student will abide by all school rules, and any decision by the school in case of violation is acceptable to me.',
      approvalText: {
        admission: t('students.approvalAdmission') || 'The mentioned student was admitted to grade',
        fee: t('students.approvalFee') || 'Admission Fee:',
        date: t('students.approvalDate') || 'Admission Date:',
        signature: t('students.approvalSignature') || 'Administrator Signature:',
        stamp: t('students.approvalStamp') || 'Stamp',
      },
    };
  }, [isRTL, t]);

  const displayValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value).trim();
  };

  const boolToText = (value?: boolean | null) => (value ? printText.yes : printText.no);

  const formatDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return formatDate(date);
  };

  return (
    <div className="student-profile-print-layout" dir={isRTL ? 'rtl' : 'ltr'}>
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
            {student.mother_name && (
              <tr>
                <td className="print-label">{t('students.motherName') || 'Mother Name'}</td>
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
              <td className="print-value">{formatDate(student.created_at)}</td>
              <td className="print-label">{printText.updatedAt}</td>
              <td className="print-value">{formatDate(student.updated_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Page Break for Second Page */}
      <div className="page-break"></div>

      {/* Commitments, Guarantee, and Approval */}
      <div className="print-title">{printText.commitmentsTitle}</div>

      {/* Commitment */}
      <div className="print-section">
        <div className="blue-title">{printText.commitmentTitle}</div>
        <ul>
          {printText.commitmentText.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ul>
        <div style={{ marginTop: '18px' }}>
          {t('common.signature') || 'Signature'}: <span className="signature-line"></span>
        </div>
      </div>

      {/* Guarantee */}
      <div className="print-section">
        <div className="blue-title">{printText.guaranteeTitle}</div>
        <div style={{ fontSize: '13pt', paddingBottom: '10px' }}>
          {printText.guaranteeText}
        </div>
        <div style={{ marginTop: '10px' }}>
          {t('students.guarantorSignature') || 'Guarantor Signature'}: <span className="signature-line"></span>
        </div>
      </div>

      {/* Approval */}
      <div className="print-section">
        <div className="blue-title">{printText.approvalTitle}</div>
        <table className="guarantee-table" style={{ width: '100%', fontSize: '13.5pt' }}>
          <tbody>
            <tr>
              <td style={{ width: isRTL ? '42%' : '58%', textAlign: isRTL ? 'right' : 'left' }}>
                {printText.approvalText.admission}
                <span className="signature-line" style={{ width: '110px', margin: '0 8px', verticalAlign: 'middle' }}></span>
                {t('students.wasAdmitted') || 'was admitted.'}
              </td>
              <td style={{ width: isRTL ? '58%' : '42%' }}></td>
            </tr>
            <tr>
              <td style={{ textAlign: isRTL ? 'right' : 'left', paddingTop: '16px' }}>
                {printText.approvalText.fee}
                <span className="signature-line" style={{ width: '140px', margin: '0 8px', verticalAlign: 'middle' }}></span>
              </td>
              <td></td>
            </tr>
            <tr>
              <td style={{ textAlign: isRTL ? 'right' : 'left', paddingTop: '16px' }}>
                {printText.approvalText.date}
                <span className="signature-line" style={{ width: '130px', margin: '0 8px', verticalAlign: 'middle' }}></span>
              </td>
              <td></td>
            </tr>
            <tr>
              <td style={{ textAlign: isRTL ? 'right' : 'left', paddingTop: '16px' }}>
                {printText.approvalText.signature}
                <span className="signature-line" style={{ width: '120px', margin: '0 8px', verticalAlign: 'middle' }}></span>
              </td>
              <td style={{ textAlign: isRTL ? 'right' : 'left', paddingTop: '16px' }}>
                {t('students.stamp') || 'Stamp'}: <span className="stamp-box">{printText.approvalText.stamp}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

