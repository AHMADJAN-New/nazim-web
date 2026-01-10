// Import pdfmake-arabic - handle both default and named exports
import * as pdfMakeModule from 'pdfmake-arabic/build/pdfmake';
let pdfMake: any = (pdfMakeModule as any).default || pdfMakeModule;
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Helper to get the actual pdfMake instance (handles different build configurations)
function getPdfMakeInstance() {
  // First try the imported pdfMake
  if (pdfMake && typeof pdfMake.createPdf === 'function') {
    return pdfMake;
  }
  // Try window.pdfMake (set during initialization)
  if (typeof window !== 'undefined' && (window as any).pdfMake && typeof (window as any).pdfMake.createPdf === 'function') {
    return (window as any).pdfMake;
  }
  // Try pdfMakeModule directly
  if (pdfMakeModule && typeof (pdfMakeModule as any).createPdf === 'function') {
    return pdfMakeModule;
  }
  if ((pdfMakeModule as any).default && typeof (pdfMakeModule as any).default.createPdf === 'function') {
    return (pdfMakeModule as any).default;
  }
  return pdfMake; // Fallback to original
}

// Get the actual pdfMake instance at module load
const actualPdfMake = getPdfMakeInstance();
if (actualPdfMake) {
  pdfMake = actualPdfMake;
}

import type { 
  Student,
  StudentEducationalHistory,
  StudentDisciplineRecord,
} from '@/hooks/useStudents';

// Ensure pdfMake is available globally for vfs_fonts (some builds need this)
if (typeof window !== 'undefined') {
  (window as any).pdfMake = pdfMake;
}

// Initialize pdfmake fonts - use a function to ensure it runs when needed
let vfsInitialized = false;

function ensureVfsInitialized() {
  // Get the current pdfMake instance (might have changed)
  const currentPdfMake = getPdfMakeInstance();
  
  if (vfsInitialized && currentPdfMake.vfs && Object.keys(currentPdfMake.vfs).length > 0) {
    return; // Already initialized
  }

  try {
    // Initialize VFS - check if it already exists first
    if (!currentPdfMake.vfs) {
      try {
        currentPdfMake.vfs = {};
      } catch (e) {
        // Object is not extensible, try to use existing vfs or skip
        if (import.meta.env.DEV) {
          console.warn('[studentProfilePdf] Could not create vfs, object may not be extensible');
        }
        // If we can't create vfs, check if it exists anyway
        if (currentPdfMake.vfs) {
          // It exists now, continue
        } else {
          throw new Error('Cannot initialize VFS - pdfMake object is not extensible');
        }
      }
    }
    
    // Merge fonts into VFS if vfs exists
    if (currentPdfMake.vfs) {
      try {
        if (pdfFonts && typeof pdfFonts === 'object') {
          let fontDataToMerge: any = null;
          
          // Pattern 1: pdfFonts has a vfs property (older versions)
          if ((pdfFonts as any).vfs && typeof (pdfFonts as any).vfs === 'object') {
            fontDataToMerge = (pdfFonts as any).vfs;
          }
          // Pattern 2: pdfFonts.pdfMake.vfs (nested structure)
          else if ((pdfFonts as any).pdfMake && (pdfFonts as any).pdfMake.vfs) {
            fontDataToMerge = (pdfFonts as any).pdfMake.vfs;
          }
          // Pattern 3: pdfFonts is the VFS object directly (newer versions)
          else {
            const sourceKeys = Object.keys(pdfFonts as any);
            // Check if it looks like a VFS object (has font file keys)
            if (sourceKeys.length > 0) {
              if (sourceKeys.some(k => k.includes('.ttf') || k.includes('roboto') || k.includes('Roboto'))) {
                fontDataToMerge = pdfFonts;
              }
            }
          }
          
          // Merge font data if we found it
          if (fontDataToMerge) {
            const sourceKeys = Object.keys(fontDataToMerge);
            if (sourceKeys.length > 0) {
              Object.assign(currentPdfMake.vfs, fontDataToMerge);
            } else if (import.meta.env.DEV) {
              console.warn('[studentProfilePdf] pdfFonts object is empty');
            }
          } else if (import.meta.env.DEV) {
            console.warn('[studentProfilePdf] Could not find font data in pdfFonts. Structure:', {
              hasPdfFonts: !!pdfFonts,
              pdfFontsKeys: pdfFonts ? Object.keys(pdfFonts as any) : [],
              hasVfs: !!(pdfFonts as any).vfs,
              hasPdfMake: !!(pdfFonts as any).pdfMake,
            });
          }
        } else if (import.meta.env.DEV) {
          console.warn('[studentProfilePdf] pdfFonts is not a valid object:', typeof pdfFonts);
        }
      } catch (e) {
        // VFS might be frozen, but that's okay if fonts are already there
        if (import.meta.env.DEV) {
          console.warn('[studentProfilePdf] Could not merge fonts into vfs, may already be initialized:', e);
        }
      }
    }

    // Register fonts properly - ensure fonts object exists
    if (!currentPdfMake.fonts) {
      try {
        currentPdfMake.fonts = {};
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('[studentProfilePdf] Could not create fonts object, may already exist');
        }
      }
    }

    // Check what fonts are available in VFS and register Roboto
    const vfs = currentPdfMake.vfs || {};
    const vfsKeys = Object.keys(vfs);

    // Find Roboto font files in VFS
    const findRobotoFont = (variant: 'regular' | 'bold' | 'italic' | 'bolditalic'): string => {
      const patterns = {
        regular: ['roboto', 'regular'],
        bold: ['roboto', 'bold'],
        italic: ['roboto', 'italic'],
        bolditalic: ['roboto', 'bold', 'italic'],
      };
      
      const pattern = patterns[variant];
      const key = vfsKeys.find(k => {
        const lower = k.toLowerCase();
        return pattern.every(p => lower.includes(p));
      });
      
      if (key && vfs[key]) return key;
      
      // Fallback: try to find any Roboto font
      const anyRoboto = vfsKeys.find(k => k.toLowerCase().includes('roboto'));
      if (anyRoboto) return anyRoboto;
      
      // Last resort: use default names
      return variant === 'regular' ? 'Roboto-Regular.ttf' :
             variant === 'bold' ? 'Roboto-Medium.ttf' :
             variant === 'italic' ? 'Roboto-Italic.ttf' :
             'Roboto-MediumItalic.ttf';
    };

    // Register Roboto fonts if we have VFS entries
    if (vfsKeys.length > 0) {
      const robotoRegular = findRobotoFont('regular');
      const robotoBold = findRobotoFont('bold');
      const robotoItalic = findRobotoFont('italic');
      const robotoBoldItalic = findRobotoFont('bolditalic');

      if (!currentPdfMake.fonts['Roboto']) {
        currentPdfMake.fonts['Roboto'] = {
          normal: robotoRegular,
          bold: robotoBold,
          italics: robotoItalic,
          bolditalics: robotoBoldItalic,
        };
      }
    } else {
      // No fonts in VFS, but still register with default names (pdfmake-arabic should have these)
      if (!currentPdfMake.fonts['Roboto']) {
        currentPdfMake.fonts['Roboto'] = {
          normal: 'Roboto-Regular.ttf',
          bold: 'Roboto-Medium.ttf',
          italics: 'Roboto-Italic.ttf',
          bolditalics: 'Roboto-MediumItalic.ttf',
        };
      }
    }

    // Mark as initialized if we have VFS
    if (currentPdfMake.vfs && Object.keys(currentPdfMake.vfs).length > 0) {
      vfsInitialized = true;
    }
    
    // Update the global pdfMake reference
    pdfMake = currentPdfMake;
    if (typeof window !== 'undefined') {
      (window as any).pdfMake = currentPdfMake;
    }
  } catch (error) {
    console.error('[studentProfilePdf] Failed to initialize pdfmake vfs fonts:', error);
    throw error;
  }
}

// Try to initialize at module load
try {
  ensureVfsInitialized();
} catch (error) {
  // Don't fail at module load, will retry when function is called
  if (import.meta.env.DEV) {
    console.warn('[studentProfilePdf] Initial VFS initialization failed, will retry when needed:', error);
  }
}

// Load and register custom fonts
let fontsLoaded = false;
let fontsLoading: Promise<void> | null = null;

async function loadCustomFonts() {
  if (fontsLoaded) return;
  if (fontsLoading) return fontsLoading;
  
  fontsLoading = (async () => {
    try {
      // Load fonts from public folder (accessible via HTTP)
      const basePath = import.meta.env.BASE_URL || '/';
      const [regularResponse, boldResponse, titrBoldResponse] = await Promise.all([
        fetch(`${basePath}fonts/Bahij Nassim-Regular.woff`),
        fetch(`${basePath}fonts/Bahij Nassim-Bold.woff`),
        fetch(`${basePath}fonts/Bahij Titr-Bold.woff`),
      ]);
      
      if (!regularResponse.ok || !boldResponse.ok || !titrBoldResponse.ok) {
        throw new Error('Font files not found in public/fonts folder');
      }
      
      const [regularBlob, boldBlob, titrBoldBlob] = await Promise.all([
        regularResponse.blob(),
        boldResponse.blob(),
        titrBoldResponse.blob(),
      ]);
      
      const regularBase64 = await blobToBase64(regularBlob);
      const boldBase64 = await blobToBase64(boldBlob);
      const titrBoldBase64 = await blobToBase64(titrBoldBlob);
      
      // Ensure VFS is initialized before adding custom fonts
      ensureVfsInitialized();
      
      // Get the current pdfMake instance
      const currentPdfMake = getPdfMakeInstance();
      
      // Add custom fonts to VFS
      if (!currentPdfMake.vfs) {
        console.warn('[studentProfilePdf] VFS not available for custom fonts, using Roboto only');
        return;
      }
      
      try {
        currentPdfMake.vfs['BahijNassim-Regular.ttf'] = regularBase64;
        currentPdfMake.vfs['BahijNassim-Bold.ttf'] = boldBase64;
        currentPdfMake.vfs['BahijTitr-Bold.ttf'] = titrBoldBase64;
      } catch (e) {
        // VFS might be frozen, skip custom fonts
        console.warn('[studentProfilePdf] Could not add custom fonts to VFS, using Roboto only');
        return;
      }
      
      // Register fonts with pdfmake (reference VFS paths)
      if (!currentPdfMake.fonts) {
        currentPdfMake.fonts = {};
      }
      currentPdfMake.fonts = {
        ...(currentPdfMake.fonts || {}),
        'BahijNassim': {
          normal: 'BahijNassim-Regular.ttf',
          bold: 'BahijNassim-Bold.ttf',
        },
        'BahijTitr': {
          normal: 'BahijTitr-Bold.ttf',
          bold: 'BahijTitr-Bold.ttf',
        },
      };
      
      fontsLoaded = true;
      console.log('[studentProfilePdf] Custom fonts loaded successfully');
    } catch (error) {
      console.error('[studentProfilePdf] Failed to load custom fonts:', error);
      console.warn('[studentProfilePdf] Falling back to Roboto font');
      // Fallback to Roboto if custom fonts fail
    }
  })();
  
  return fontsLoading;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 part (remove data:font/woff;base64, prefix if present)
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface StudentProfilePdfOptions {
  student: Student;
  schoolName: string | null;
  pictureUrl: string | null;
  guardianPictureUrl: string | null;
  isRTL: boolean;
  educationalHistory?: StudentEducationalHistory[];
  disciplineRecords?: StudentDisciplineRecord[];
}

export async function generateStudentProfilePdf({
  student,
  schoolName,
  pictureUrl,
  guardianPictureUrl,
  isRTL,
  educationalHistory = [],
  disciplineRecords = [],
}: StudentProfilePdfOptions) {
  // Ensure VFS is initialized before proceeding
  ensureVfsInitialized();
  
  // Get the current pdfMake instance
  const currentPdfMake = getPdfMakeInstance();

  // Verify VFS is available
  if (!currentPdfMake.vfs || Object.keys(currentPdfMake.vfs).length === 0) {
    throw new Error('PDF fonts (vfs) not initialized. Please check pdfmake configuration.');
  }

  // Load custom fonts before generating PDF
  await loadCustomFonts();

  // Helper to normalize text for proper Unicode rendering (especially for RTL)
  const normalizeText = (text: string): string => {
    if (!text) return '';

    // Normalize to NFC form for proper Unicode handling
    let normalized = String(text).trim().normalize('NFC');

    // If the text contains Arabic/Pashto characters AND we are in RTL mode,
    // reverse the word order so pdfmake displays it visually RTL.
    // pdfmake-arabic helps with direction but we still need to reverse word order
    const hasArabic = /[\u0600-\u06FF]/.test(normalized);
    if (hasArabic && isRTL) {
      // Split by spaces, preserving all spaces (including multiple spaces)
      // Use a regex that captures spaces as separate elements
      const parts: string[] = [];
      const regex = /(\S+|\s+)/g;
      let match;
      
      while ((match = regex.exec(normalized)) !== null) {
        parts.push(match[0]);
      }
      
      // Reverse the parts array to reverse word order
      normalized = parts.reverse().join('');
      
      // Ensure single spaces between words (normalize multiple spaces to single)
      normalized = normalized.replace(/\s+/g, ' ');
    }

    return normalized;
  };

  const displayValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return normalizeText(String(value));
  };

  const boolToText = (value?: boolean | null) => (value ? (isRTL ? 'هو' : 'Yes') : (isRTL ? 'نه' : 'No'));

  const formatDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  // Translation texts
  const texts = isRTL
    ? {
        title: 'د زده کوونکي انفرادي معلومات',
        personal: 'شخصي معلومات',
        admissionSection: 'د داخلې معلومات',
        addressSection: 'استوګنځای معلومات',
        guardianSection: 'د سرپرست معلومات',
        otherInfo: 'نور معلومات',
        name: 'نوم',
        fatherName: 'د پلار نوم',
        grandfatherName: 'د نیکه نوم',
        motherName: 'د مور نوم',
        birthYear: 'د زیږون کال',
        gender: 'جنس',
        tazkiraNumber: 'تذکره نمبر',
        idNumber: 'ID',
        cardNumber: 'کارډ نمبر',
        admissionNo: 'اساس نمبر',
        admissionYear: 'د شمولیت کال',
        applyingGrade: 'د داخلې درجه',
        schoolLabel: 'مدرسه',
        originProvince: 'اصلي ولایت',
        originDistrict: 'اصلي ولسوالۍ',
        originVillage: 'اصلي کلي / ناحیه',
        currentProvince: 'فعلي ولایت',
        currentDistrict: 'فعلي ولسوالۍ',
        currentVillage: 'فعلي کلي / ناحیه',
        homeAddress: 'د فعلي استوګنځای دقیق ادرس',
        guardianName: 'د سرپرست نوم',
        guardianRelation: 'له زده کوونکي سره تړاو',
        guardianPhone: 'ټلفون',
        guardianTazkira: 'تذکره',
        guarantorName: 'د ضامن نوم',
        guarantorPhone: 'د ضامن د ټیلیفون نمبر',
        guarantorTazkira: 'د ضامن تذکره',
        guarantorAddress: 'د ضامن ادرس',
        isOrphan: 'یتیم دی؟',
        feeStatus: 'د داخلې فیس حالت',
        createdAt: 'ریکارډ جوړ شوی',
        updatedAt: 'ریکارډ تازه شوی',
        guardianLabel: 'سرپرست',
        studentLabel: 'زده کونکی',
        male: 'نارینه',
        female: 'ښځینه',
        educationalHistory: 'د زده کړو تاریخچه',
        disciplineRecords: 'د نظم ریکارډونه',
        institutionName: 'د موسسې نوم',
        academicYear: 'تعلیمي کال',
        gradeLevel: 'صنف',
        period: 'موده',
        achievements: 'لاسته راوړنې',
        notes: 'یادښتونه',
        incidentDate: 'د پیښې نیټه',
        incidentType: 'د پیښې ډول',
        severity: 'شدت',
        description: 'توضیحات',
        actionTaken: 'ترسره شوی اقدام',
        resolved: 'حل شوی',
        pending: 'پاتې',
        minor: 'کم',
        moderate: 'منځنی',
        major: 'لوی',
        severe: 'سخت',
        resolvedDate: 'د حل نیټه',
        noHistory: 'د زده کړو تاریخچه نشته',
        noDiscipline: 'د نظم ریکارډونه نشته',
      }
    : {
        title: 'Student Personal Information',
        personal: 'Personal Information',
        admissionSection: 'Admission Information',
        addressSection: 'Address Information',
        guardianSection: 'Guardian Information',
        otherInfo: 'Other Information',
        name: 'Name',
        fatherName: 'Father Name',
        grandfatherName: 'Grandfather Name',
        motherName: 'Mother Name',
        birthYear: 'Birth Year',
        gender: 'Gender',
        tazkiraNumber: 'Tazkira Number',
        idNumber: 'ID',
        cardNumber: 'Card Number',
        admissionNo: 'Admission No',
        admissionYear: 'Admission Year',
        applyingGrade: 'Applying Grade',
        schoolLabel: 'School',
        originProvince: 'Origin Province',
        originDistrict: 'Origin District',
        originVillage: 'Origin Village',
        currentProvince: 'Current Province',
        currentDistrict: 'Current District',
        currentVillage: 'Current Village',
        homeAddress: 'Home Address',
        guardianName: 'Guardian Name',
        guardianRelation: 'Relation',
        guardianPhone: 'Phone',
        guardianTazkira: 'Tazkira',
        guarantorName: 'Guarantor Name',
        guarantorPhone: 'Guarantor Phone',
        guarantorTazkira: 'Guarantor Tazkira',
        guarantorAddress: 'Guarantor Address',
        isOrphan: 'Is Orphan?',
        feeStatus: 'Fee Status',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
        guardianLabel: 'Guardian',
        studentLabel: 'Student',
        male: 'Male',
        female: 'Female',
        educationalHistory: 'Educational History',
        disciplineRecords: 'Discipline Records',
        institutionName: 'Institution Name',
        academicYear: 'Academic Year',
        gradeLevel: 'Grade Level',
        period: 'Period',
        achievements: 'Achievements',
        notes: 'Notes',
        incidentDate: 'Incident Date',
        incidentType: 'Incident Type',
        severity: 'Severity',
        description: 'Description',
        actionTaken: 'Action Taken',
        resolved: 'Resolved',
        pending: 'Pending',
        minor: 'Minor',
        moderate: 'Moderate',
        major: 'Major',
        severe: 'Severe',
        resolvedDate: 'Resolved Date',
        noHistory: 'No educational history',
        noDiscipline: 'No discipline records',
      };

  // Helper to create table row
  const createTableRow = (label: string, value: string, label2?: string, value2?: string) => {
    const cells: any[] = [
      {
        text: normalizeText(label),
        bold: true,
        fontSize: 10,
        color: '#0b0b56',
        width: '25%',
        alignment: isRTL ? 'right' : 'left',
        fillColor: '#f8f9fa',
      },
      {
        text: normalizeText(value || ''),
        fontSize: 10,
        width: '25%',
        alignment: isRTL ? 'right' : 'left',
        fillColor: '#ffffff',
      },
    ];

    if (label2 && value2 !== undefined) {
      cells.push(
        {
          text: normalizeText(label2),
          bold: true,
          fontSize: 10,
          color: '#0b0b56',
          width: '25%',
          alignment: isRTL ? 'right' : 'left',
          fillColor: '#f8f9fa',
        },
        {
          text: normalizeText(value2 || ''),
          fontSize: 10,
          width: '25%',
          alignment: isRTL ? 'right' : 'left',
          fillColor: '#ffffff',
        }
      );
    } else {
      cells.push({ text: '', width: '25%', fillColor: '#ffffff' }, { text: '', width: '25%', fillColor: '#ffffff' });
    }

    // Reverse column order for RTL to make text flow right-to-left
    return isRTL ? cells.reverse() : cells;
  };

  // Helper to create placeholder image as PNG base64
  const createPlaceholderImage = (label: string): string => {
    try {
      // Create a simple canvas-based placeholder
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        // Fallback: return a minimal valid PNG data URL
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      }
      
      // Background
      ctx.fillStyle = '#f9f9f9';
      ctx.fillRect(0, 0, 100, 120);
      
      // Border
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, 100, 120);
      
      // Text
      ctx.fillStyle = '#999';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 50, 60);
      
      const dataUrl = canvas.toDataURL('image/png');
      // Verify it's a valid data URL
      if (dataUrl && dataUrl.startsWith('data:image/png;base64,')) {
        return dataUrl;
      }
      
      // Fallback
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    } catch (error) {
      console.warn('Failed to create placeholder image:', error);
      // Return minimal valid PNG (1x1 transparent)
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
  };

  // Helper to convert image URL to base64 (for pdfmake compatibility)
  const getImageData = async (url: string | null, placeholder: string): Promise<string> => {
    if (!url) return createPlaceholderImage(placeholder);
    
    // If already base64 data URL, validate and return
    if (url.startsWith('data:image/')) {
      // Ensure it's a valid image format
      const match = url.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
      if (match) {
        return url;
      }
      // If it's SVG or other format, convert to PNG
      try {
        return await convertToPng(url);
      } catch {
        return createPlaceholderImage(placeholder);
      }
    }
    
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      
      // Check if it's a valid image type
      if (!blob.type.startsWith('image/')) {
        throw new Error('Not an image');
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Ensure it's a valid image data URL (PNG, JPEG, etc.)
          if (result && result.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/)) {
            resolve(result);
          } else {
            // Try to convert to PNG if it's an unsupported format
            if (result && result.startsWith('data:image/')) {
              convertToPng(result).then(resolve).catch(() => {
                reject(new Error('Invalid image format'));
              });
            } else {
              reject(new Error('Invalid image data'));
            }
          }
        };
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Failed to load image, using placeholder:', error);
      return createPlaceholderImage(placeholder);
    }
  };

  // Helper to convert SVG or other formats to PNG
  const convertToPng = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 100;
            canvas.height = img.height || 120;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const pngDataUrl = canvas.toDataURL('image/png');
              if (pngDataUrl && pngDataUrl.startsWith('data:image/png;base64,')) {
                resolve(pngDataUrl);
              } else {
                reject(new Error('Invalid PNG conversion result'));
              }
            } else {
              reject(new Error('Could not create canvas context'));
            }
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      } catch (error) {
        reject(error);
      }
    });
  };

  // Load images (convert URLs to base64 if needed)
  let guardianImage: string;
  let studentImage: string;
  
  try {
    guardianImage = await getImageData(guardianPictureUrl, texts.guardianLabel);
  } catch (error) {
    console.warn('Failed to load guardian image:', error);
    guardianImage = createPlaceholderImage(texts.guardianLabel);
  }
  
  try {
    studentImage = await getImageData(pictureUrl, texts.studentLabel);
  } catch (error) {
    console.warn('Failed to load student image:', error);
    studentImage = createPlaceholderImage(texts.studentLabel);
  }

  // Header with photos - Enhanced design
  const headerContent: any[] = [];
  
  // Guardian photo with border
  headerContent.push({
    stack: [
      {
        table: {
          widths: [90],
          body: [[
            {
              stack: [
                {
                  image: guardianImage,
                  width: 80,
                  height: 100,
                  alignment: 'center',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: normalizeText(texts.guardianLabel),
                  fontSize: 8,
                  color: '#666',
                  alignment: 'center',
                  margin: [0, 3, 0, 5],
                },
              ],
              border: [true, true, true, true],
              borderColor: '#d0d0d0',
              fillColor: '#fafafa',
            },
          ]],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
        },
      },
    ],
    width: 90,
  });

  // Student info in center with styled background
  headerContent.push({
    stack: [
      {
        table: {
          widths: [375],
          body: [[
            {
              stack: [
                {
                  text: displayValue(student.full_name),
                  fontSize: 18,
                  bold: true,
                  color: '#0b0b56',
                  alignment: 'center',
                  margin: [0, 8, 0, 6],
                  font: isRTL ? 'BahijTitr' : 'Roboto',
                },
                {
                  text: `${displayValue(student.father_name)}${student.grandfather_name ? ` ${displayValue(student.grandfather_name)}` : ''}`,
                  fontSize: 12,
                  color: '#444',
                  alignment: 'center',
                  margin: [0, 0, 0, 4],
                },
                {
                  text: `${normalizeText(texts.idNumber)}: ${displayValue(student.admission_no)}`,
                  fontSize: 10,
                  color: '#666',
                  alignment: 'center',
                  margin: [0, 0, 0, 0],
                },
                ...(student.is_orphan ? [{
                  text: '● ' + (isRTL ? 'یتیم' : 'Orphan'),
                  fontSize: 9,
                  color: '#dc2626',
                  alignment: 'center',
                  margin: [0, 4, 0, 0],
                }] : []),
              ],
              border: [true, true, true, true],
              borderColor: '#0b0b56',
              borderWidths: [0, 0, 0, 0],
              fillColor: '#ffffff',
            },
          ]],
        },
        layout: {
          hLineWidth: (i: number) => i === 0 ? 3 : 0,
          vLineWidth: () => 0,
          hLineColor: () => '#0b0b56',
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
      },
    ],
    alignment: 'center',
    flex: 1,
    margin: [10, 0, 10, 0],
  });

  // Student photo with border
  headerContent.push({
    stack: [
      {
        table: {
          widths: [90],
          body: [[
            {
              stack: [
                {
                  image: studentImage,
                  width: 80,
                  height: 100,
                  alignment: 'center',
                  margin: [0, 5, 0, 0],
                },
                {
                  text: normalizeText(texts.studentLabel),
                  fontSize: 8,
                  color: '#666',
                  alignment: 'center',
                  margin: [0, 3, 0, 5],
                },
              ],
              border: [true, true, true, true],
              borderColor: '#d0d0d0',
              fillColor: '#fafafa',
            },
          ]],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
        },
      },
    ],
    width: 90,
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [20, 20, 20, 20],
    // pdfmake-arabic handles RTL automatically when direction is set
    ...(isRTL && { direction: 'rtl' }),
    defaultStyle: {
      font: isRTL ? 'BahijNassim' : 'Roboto',
      fontSize: 10,
      color: '#1a1a1a',
      alignment: isRTL ? 'right' : 'left',
      characterSpacing: isRTL ? 0.4 : 0,
      lineHeight: 1.4,
    },
    // Ensure proper Unicode handling for RTL languages
    compress: false,
    background: function(currentPage: number, pageSize: any) {
      return {
        canvas: [
          {
            type: 'rect',
            x: 0,
            y: 0,
            w: pageSize.width,
            h: pageSize.height,
            color: '#fafafa',
          },
        ],
      };
    },
    content: [
      // Title with decorative background
      {
        stack: [
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: 555,
                h: 60,
                color: '#0b0b56',
                r: 4,
              },
            ],
            absolutePosition: { x: 20, y: 20 },
          },
          {
            text: normalizeText(texts.title),
            fontSize: 22,
            bold: true,
            alignment: 'center',
            color: '#ffffff',
            margin: [0, 18, 0, 0],
            font: isRTL ? 'BahijTitr' : 'Roboto',
          },
        ],
        margin: [0, 0, 0, 24],
      },
      // Header with photos
      {
        columns: headerContent,
        margin: [0, 0, 0, 30],
      },
      // Personal Information - Enhanced section header
      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: normalizeText(texts.personal),
              fontSize: 14,
              bold: true,
              color: '#ffffff',
              fillColor: '#0b0b56',
              margin: [10, 6, 10, 6],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          widths: isRTL ? ['25%', '25%', '25%', '25%'].reverse() : ['25%', '25%', '25%', '25%'],
          body: [
            createTableRow(texts.name, displayValue(student.full_name), texts.fatherName, displayValue(student.father_name)),
            createTableRow(
              texts.grandfatherName,
              displayValue(student.grandfather_name),
              texts.birthYear,
              displayValue(student.birth_year)
            ),
            ...(student.mother_name
              ? [createTableRow(texts.motherName, displayValue(student.mother_name), texts.gender, student.gender === 'male' ? texts.male : texts.female)]
              : [createTableRow(texts.gender, student.gender === 'male' ? texts.male : texts.female, '', '')]),
          ],
        },
        layout: {
          hLineWidth: function (i: number, node: any) {
            return i === 0 || i === node.table.body.length ? 1 : 0.5;
          },
          vLineWidth: function () {
            return 0.5;
          },
          hLineColor: function () {
            return '#d0d0d0';
          },
          vLineColor: function () {
            return '#d0d0d0';
          },
          paddingLeft: function () {
            return 10;
          },
          paddingRight: function () {
            return 10;
          },
          paddingTop: function () {
            return 8;
          },
          paddingBottom: function () {
            return 8;
          },
        },
        margin: [0, 0, 0, 16],
      },
      // Admission Information - Enhanced section header
      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: normalizeText(texts.admissionSection),
              fontSize: 14,
              bold: true,
              color: '#ffffff',
              fillColor: '#0b0b56',
              margin: [10, 6, 10, 6],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          widths: isRTL ? ['25%', '25%', '25%', '25%'].reverse() : ['25%', '25%', '25%', '25%'],
          body: [
            createTableRow(texts.cardNumber, displayValue(student.card_number), texts.admissionNo, displayValue(student.admission_no)),
            createTableRow(texts.admissionYear, displayValue(student.admission_year), texts.applyingGrade, displayValue(student.applying_grade)),
            (() => {
              if (isRTL) {
                // RTL: value (3 cols) + label (1 col) = 4 cols total
                return [
                  {
                    text: displayValue(schoolName),
                    fontSize: 10,
                    colSpan: 3,
                    alignment: 'right',
                  },
                  {},
                  {},
                  {
                    text: normalizeText(texts.schoolLabel),
                    bold: true,
                    fontSize: 10,
                    color: '#0b0b56',
                    width: '25%',
                    alignment: 'right',
                  },
                ];
              } else {
                // LTR: label (1 col) + value (3 cols) = 4 cols total
                return [
                  {
                    text: normalizeText(texts.schoolLabel),
                    bold: true,
                    fontSize: 10,
                    color: '#0b0b56',
                    width: '25%',
                    alignment: 'left',
                  },
                  {
                    text: displayValue(schoolName),
                    fontSize: 10,
                    colSpan: 3,
                    alignment: 'left',
                  },
                  {},
                  {},
                ];
              }
            })(),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => i === 0 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 16],
      },
      // Address Information - Enhanced section header
      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: normalizeText(texts.addressSection),
              fontSize: 14,
              bold: true,
              color: '#ffffff',
              fillColor: '#0b0b56',
              margin: [10, 6, 10, 6],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          widths: isRTL ? ['16.66%', '16.66%', '16.66%', '16.66%', '16.66%', '16.66%'].reverse() : ['16.66%', '16.66%', '16.66%', '16.66%', '16.66%', '16.66%'],
          body: [
            (() => {
              const row = [
                { text: normalizeText(texts.originProvince), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.orig_province), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
                { text: normalizeText(texts.originDistrict), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.orig_district), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
                { text: normalizeText(texts.originVillage), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.orig_village), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
              ];
              return isRTL ? row.reverse() : row;
            })(),
            (() => {
              const row = [
                { text: normalizeText(texts.currentProvince), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.curr_province), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
                { text: normalizeText(texts.currentDistrict), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.curr_district), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
                { text: normalizeText(texts.currentVillage), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.curr_village), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
              ];
              return isRTL ? row.reverse() : row;
            })(),
            (() => {
              if (isRTL) {
                // RTL: value (4 cols) + label (2 cols) = 6 cols total
                return [
                  {
                    text: displayValue(student.home_address),
                    fontSize: 10,
                    colSpan: 4,
                    alignment: 'right',
                  },
                  {},
                  {},
                  {},
                  {
                    text: normalizeText(texts.homeAddress),
                    bold: true,
                    fontSize: 10,
                    color: '#0b0b56',
                    colSpan: 2,
                    alignment: 'right',
                  },
                  {},
                ];
              } else {
                // LTR: label (2 cols) + value (4 cols) = 6 cols total
                return [
                  {
                    text: normalizeText(texts.homeAddress),
                    bold: true,
                    fontSize: 10,
                    color: '#0b0b56',
                    colSpan: 2,
                    alignment: 'left',
                  },
                  {},
                  {
                    text: displayValue(student.home_address),
                    fontSize: 10,
                    colSpan: 4,
                    alignment: 'left',
                  },
                  {},
                  {},
                  {},
                ];
              }
            })(),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => i === 0 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 16],
      },
      // Guardian Information - Enhanced section header
      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: normalizeText(texts.guardianSection),
              fontSize: 14,
              bold: true,
              color: '#ffffff',
              fillColor: '#0b0b56',
              margin: [10, 6, 10, 6],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          widths: isRTL ? ['16.66%', '16.66%', '16.66%', '16.66%', '16.66%', '16.66%'].reverse() : ['16.66%', '16.66%', '16.66%', '16.66%', '16.66%', '16.66%'],
          body: [
            (() => {
              const row = [
                { text: normalizeText(texts.guardianName), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.guardian_name), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
                { text: normalizeText(texts.guardianRelation), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.guardian_relation), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
                { text: normalizeText(texts.guardianPhone), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.guardian_phone), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
              ];
              return isRTL ? row.reverse() : row;
            })(),
            (() => {
              const row = [
                { text: normalizeText(texts.guardianTazkira), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.guardian_tazkira), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
                { text: normalizeText(texts.guarantorName), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.zamin_name), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
                { text: normalizeText(texts.guarantorPhone), bold: true, fontSize: 10, color: '#0b0b56', alignment: isRTL ? 'right' : 'left' },
                { text: displayValue(student.zamin_phone), fontSize: 10, alignment: isRTL ? 'right' : 'left' },
              ];
              return isRTL ? row.reverse() : row;
            })(),
            (() => {
              if (isRTL) {
                // RTL: value (2 cols) + label (2 cols) + tazkira (2 cols) = 6 cols total
                return [
                  {
                    text: displayValue(student.zamin_address),
                    fontSize: 10,
                    colSpan: 2,
                    alignment: 'right',
                  },
                  {},
                  {
                    text: normalizeText(texts.guarantorAddress),
                    bold: true,
                    fontSize: 10,
                    color: '#0b0b56',
                    colSpan: 2,
                    alignment: 'right',
                  },
                  {},
                  {
                    text: normalizeText(texts.guarantorTazkira),
                    bold: true,
                    fontSize: 10,
                    color: '#0b0b56',
                    alignment: 'right',
                  },
                  { text: displayValue(student.zamin_tazkira), fontSize: 10, alignment: 'right' },
                ];
              } else {
                // LTR: tazkira (2 cols) + label (2 cols) + value (2 cols) = 6 cols total
                return [
                  {
                    text: normalizeText(texts.guarantorTazkira),
                    bold: true,
                    fontSize: 10,
                    color: '#0b0b56',
                    alignment: 'left',
                  },
                  { text: displayValue(student.zamin_tazkira), fontSize: 10, alignment: 'left' },
                  {
                    text: normalizeText(texts.guarantorAddress),
                    bold: true,
                    fontSize: 10,
                    color: '#0b0b56',
                    colSpan: 2,
                    alignment: 'left',
                  },
                  {},
                  {
                    text: displayValue(student.zamin_address),
                    fontSize: 10,
                    colSpan: 2,
                    alignment: 'left',
                  },
                  {},
                ];
              }
            })(),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => i === 0 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 16],
      },
      // Other Information - Enhanced section header
      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: normalizeText(texts.otherInfo),
              fontSize: 14,
              bold: true,
              color: '#ffffff',
              fillColor: '#0b0b56',
              margin: [10, 6, 10, 6],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          widths: isRTL ? ['25%', '25%', '25%', '25%'].reverse() : ['25%', '25%', '25%', '25%'],
          body: [
            createTableRow(texts.isOrphan, normalizeText(boolToText(student.is_orphan)), texts.feeStatus, displayValue(student.admission_fee_status)),
            createTableRow(texts.createdAt, formatDate(student.created_at), texts.updatedAt, formatDate(student.updated_at)),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => i === 0 || i === node.table.body.length ? 1 : 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#d0d0d0',
          vLineColor: () => '#d0d0d0',
          paddingLeft: () => 10,
          paddingRight: () => 10,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 16],
      },
      // Educational History Section - Enhanced section header
      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: normalizeText(texts.educationalHistory),
              fontSize: 14,
              bold: true,
              color: '#ffffff',
              fillColor: '#0b0b56',
              margin: [10, 6, 10, 6],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      ...(educationalHistory && educationalHistory.length > 0
        ? educationalHistory.map((record) => ({
            table: {
              widths: isRTL ? ['25%', '25%', '25%', '25%'].reverse() : ['25%', '25%', '25%', '25%'],
              body: [
                createTableRow(
                  normalizeText(texts.institutionName),
                  displayValue(record.institution_name),
                  normalizeText(texts.academicYear),
                  displayValue(record.academic_year)
                ),
                ...(record.grade_level || record.start_date || record.end_date
                  ? [
                      createTableRow(
                        normalizeText(texts.gradeLevel),
                        displayValue(record.grade_level),
                        normalizeText(texts.period),
                        record.start_date && record.end_date
                          ? `${formatDate(record.start_date)} - ${formatDate(record.end_date)}`
                          : record.start_date
                            ? formatDate(record.start_date)
                            : ''
                      ),
                    ]
                  : []),
                ...(record.achievements
                  ? [
                      [
                        {
                          text: normalizeText(texts.achievements),
                          bold: true,
                          fontSize: 10,
                          color: '#0b0b56',
                          colSpan: 2,
                          alignment: isRTL ? 'right' : 'left',
                        },
                        {},
                        {
                          text: displayValue(record.achievements),
                          fontSize: 10,
                          colSpan: 2,
                          alignment: isRTL ? 'right' : 'left',
                        },
                        {},
                      ],
                    ]
                  : []),
                ...(record.notes
                  ? [
                      [
                        {
                          text: normalizeText(texts.notes),
                          bold: true,
                          fontSize: 10,
                          color: '#0b0b56',
                          colSpan: 2,
                          alignment: isRTL ? 'right' : 'left',
                        },
                        {},
                        {
                          text: displayValue(record.notes),
                          fontSize: 10,
                          colSpan: 2,
                          alignment: isRTL ? 'right' : 'left',
                        },
                        {},
                      ],
                    ]
                  : []),
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) => i === 0 || i === node.table.body.length ? 1 : 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#d0d0d0',
              vLineColor: () => '#d0d0d0',
              paddingLeft: () => 10,
              paddingRight: () => 10,
              paddingTop: () => 8,
              paddingBottom: () => 8,
            },
            margin: [0, 0, 0, 12],
          }))
        : [
            {
              text: normalizeText(texts.noHistory),
              fontSize: 10,
              color: '#666',
              alignment: isRTL ? 'right' : 'left',
              margin: [0, 0, 0, 12],
            },
          ]),
      // Discipline Records Section - Enhanced section header
      {
        table: {
          widths: ['*'],
          body: [[
            {
              text: normalizeText(texts.disciplineRecords),
              fontSize: 14,
              bold: true,
              color: '#ffffff',
              fillColor: '#0b0b56',
              margin: [10, 6, 10, 6],
            },
          ]],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 0, 0, 12],
      },
      ...(disciplineRecords && disciplineRecords.length > 0
        ? disciplineRecords.map((record) => ({
            table: {
              widths: isRTL ? ['25%', '25%', '25%', '25%'].reverse() : ['25%', '25%', '25%', '25%'],
              body: [
                createTableRow(
                  normalizeText(texts.incidentDate),
                  formatDate(record.incident_date),
                  normalizeText(texts.incidentType),
                  displayValue(record.incident_type)
                ),
                createTableRow(
                  normalizeText(texts.severity),
                  normalizeText(
                    record.severity === 'minor'
                      ? texts.minor
                      : record.severity === 'moderate'
                        ? texts.moderate
                        : record.severity === 'major'
                          ? texts.major
                          : record.severity === 'severe'
                            ? texts.severe
                            : record.severity
                  ),
                  record.resolved ? normalizeText(texts.resolved) : normalizeText(texts.pending),
                  record.resolved ? normalizeText(texts.resolved) : normalizeText(texts.pending)
                ),
                ...(record.description
                  ? [
                      [
                        {
                          text: normalizeText(texts.description),
                          bold: true,
                          fontSize: 10,
                          color: '#0b0b56',
                          colSpan: 2,
                          alignment: isRTL ? 'right' : 'left',
                        },
                        {},
                        {
                          text: displayValue(record.description),
                          fontSize: 10,
                          colSpan: 2,
                          alignment: isRTL ? 'right' : 'left',
                        },
                        {},
                      ],
                    ]
                  : []),
                ...(record.action_taken
                  ? [
                      [
                        {
                          text: normalizeText(texts.actionTaken),
                          bold: true,
                          fontSize: 10,
                          color: '#0b0b56',
                          colSpan: 2,
                          alignment: isRTL ? 'right' : 'left',
                        },
                        {},
                        {
                          text: displayValue(record.action_taken),
                          fontSize: 10,
                          colSpan: 2,
                          alignment: isRTL ? 'right' : 'left',
                        },
                        {},
                      ],
                    ]
                  : []),
                ...(record.resolved && record.resolved_date
                  ? [
                      createTableRow(
                        normalizeText(texts.resolved),
                        normalizeText(texts.resolved),
                        normalizeText(texts.resolvedDate),
                        formatDate(record.resolved_date)
                      ),
                    ]
                  : []),
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) => i === 0 || i === node.table.body.length ? 1 : 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => '#d0d0d0',
              vLineColor: () => '#d0d0d0',
              paddingLeft: () => 10,
              paddingRight: () => 10,
              paddingTop: () => 8,
              paddingBottom: () => 8,
            },
            margin: [0, 0, 0, 12],
          }))
        : [
            {
              text: normalizeText(texts.noDiscipline),
              fontSize: 10,
              color: '#666',
              alignment: isRTL ? 'right' : 'left',
              margin: [0, 0, 0, 12],
            },
          ]),
    ],
  };

  // Generate PDF and open print dialog in current tab
  // Ensure we have the current pdfMake instance
  const pdfMakeInstance = getPdfMakeInstance();
  if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
    throw new Error('pdfMake.createPdf is not available. Please check pdfmake-arabic import.');
  }
  const pdfDoc = pdfMakeInstance.createPdf(docDefinition);
  
  // Get PDF blob and create iframe in current page for printing
  pdfDoc.getBlob((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    
    // Create a hidden iframe in the current page
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.src = url;
    
    document.body.appendChild(iframe);
    
    // Wait for PDF to load, then trigger print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          // Trigger print dialog
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
          
          // Don't automatically close - let the iframe stay alive
          // The iframe will remain in the DOM until the page is refreshed or navigated away
          // This ensures the print dialog stays open and functional
          
        } catch (error) {
          console.error('Error printing PDF:', error);
          // Only clean up on error
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(url);
        }
      }, 500);
    };
    
    // Only clean up if there's an error loading
    iframe.onerror = () => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
      URL.revokeObjectURL(url);
    };
  });
}

