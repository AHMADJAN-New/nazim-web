<?php

namespace App\Services\Reports;

use Carbon\Carbon;

/**
 * Service for converting dates between Gregorian, Hijri Shamsi (Solar/Jalali), and Hijri Qamari (Lunar/Islamic) calendars
 */
class DateConversionService
{
    // Jalali month names in Farsi
    public const JALALI_MONTHS_FA = [
        1 => 'حمل',      // Hamal
        2 => 'ثور',      // Sawr
        3 => 'جوزا',     // Jawza
        4 => 'سرطان',    // Saratan
        5 => 'اسد',      // Asad
        6 => 'سنبله',    // Sonbola
        7 => 'میزان',    // Mizan
        8 => 'عقرب',     // Aqrab
        9 => 'قوس',      // Qaws
        10 => 'جدی',     // Jadi
        11 => 'دلو',     // Dalw
        12 => 'حوت',     // Hoot
    ];

    // Jalali month names in Pashto (Afghan calendar)
    public const JALALI_MONTHS_PS = [
        1 => 'وری',      // Wray
        2 => 'غویی',     // Ghwayee
        3 => 'غبرګولی',   // Gbargolay
        4 => 'چنګاښ',    // Changaakh
        5 => 'زمری',     // Zmaray
        6 => 'وږی',      // Wazzhay
        7 => 'تله',      // Tala
        8 => 'لړم',      // Laram
        9 => 'لیندۍ',    // Lindai
        10 => 'مرغومی',   // Marghumay
        11 => 'سلواغه',   // Salwagha
        12 => 'کب',      // Kab
    ];

    // Hijri Qamari month names
    public const HIJRI_MONTHS_AR = [
        1 => 'محرم',
        2 => 'صفر',
        3 => 'ربیع الاول',
        4 => 'ربیع الثانی',
        5 => 'جمادی الاول',
        6 => 'جمادی الثانی',
        7 => 'رجب',
        8 => 'شعبان',
        9 => 'رمضان',
        10 => 'شوال',
        11 => 'ذوالقعده',
        12 => 'ذوالحجه',
    ];

    // Persian/Pashto numerals
    public const PERSIAN_NUMERALS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

    // Arabic numerals
    public const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

    /**
     * Convert a date to Jalali (Hijri Shamsi) calendar
     *
     * @param Carbon|string|\DateTime $date
     * @return array{year: int, month: int, day: int}
     */
    public function toJalali($date): array
    {
        $carbon = $this->toCarbon($date);
        $gy = $carbon->year;
        $gm = $carbon->month;
        $gd = $carbon->day;

        $gDaysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        $jDaysInMonth = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

        $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
        $days = 355666 + (365 * $gy) + floor(($gy2 + 3) / 4) - floor(($gy2 + 99) / 100)
            + floor(($gy2 + 399) / 400);

        for ($i = 0; $i < $gm; ++$i) {
            $days += $gDaysInMonth[$i];
        }

        if ($gm > 2 && (($gy % 4 == 0 && $gy % 100 != 0) || ($gy % 400 == 0))) {
            ++$days;
        }

        $days += $gd;

        $jy = -1595 + (33 * floor($days / 12053));
        $days %= 12053;

        $jy += (4 * floor($days / 1461));
        $days %= 1461;

        if ($days > 365) {
            $jy += floor(($days - 1) / 365);
            $days = ($days - 1) % 365;
        }

        $jm = 0;
        for ($i = 1; $i <= 12 && $days >= $jDaysInMonth[$i]; ++$i) {
            $days -= $jDaysInMonth[$i];
            ++$jm;
        }
        ++$jm;
        $jd = $days + 1;

        return ['year' => (int) $jy, 'month' => (int) $jm, 'day' => (int) $jd];
    }

    /**
     * Convert Jalali date to Gregorian
     *
     * @param int $jy Jalali year
     * @param int $jm Jalali month
     * @param int $jd Jalali day
     * @return Carbon
     */
    public function jalaliToGregorian(int $jy, int $jm, int $jd): Carbon
    {
        $jDaysInMonth = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

        $jy += 1595;
        $days = -355668 + (365 * $jy) + (floor($jy / 33) * 8) + floor((($jy % 33) + 3) / 4);

        for ($i = 1; $i < $jm; ++$i) {
            $days += $jDaysInMonth[$i];
        }
        $days += $jd;

        $gy = 400 * floor($days / 146097);
        $days %= 146097;

        if ($days > 36524) {
            $gy += 100 * floor(--$days / 36524);
            $days %= 36524;
            if ($days >= 365) {
                ++$days;
            }
        }

        $gy += 4 * floor($days / 1461);
        $days %= 1461;

        if ($days > 365) {
            $gy += floor(($days - 1) / 365);
            $days = ($days - 1) % 365;
        }

        $gd = $days + 1;

        $gDaysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        // Check for leap year
        if (($gy % 4 == 0 && $gy % 100 != 0) || ($gy % 400 == 0)) {
            ++$gDaysInMonth[2];
        }

        $gm = 0;
        for ($i = 1; $i <= 12 && $gd > $gDaysInMonth[$i]; ++$i) {
            $gd -= $gDaysInMonth[$i];
            ++$gm;
        }
        ++$gm;

        return Carbon::createFromDate((int) $gy, (int) $gm, (int) $gd);
    }

    /**
     * Convert a date to Hijri Qamari (Islamic lunar calendar)
     *
     * @param Carbon|string|\DateTime $date
     * @return array{year: int, month: int, day: int}
     */
    public function toHijriQamari($date): array
    {
        $carbon = $this->toCarbon($date);

        // Julian day calculation
        $jd = $this->gregorianToJulian($carbon->year, $carbon->month, $carbon->day);

        // Convert Julian day to Hijri
        return $this->julianToHijri($jd);
    }

    /**
     * Convert Hijri Qamari date to Gregorian
     *
     * @param int $hy Hijri year
     * @param int $hm Hijri month
     * @param int $hd Hijri day
     * @return Carbon
     */
    public function hijriToGregorian(int $hy, int $hm, int $hd): Carbon
    {
        $jd = $this->hijriToJulian($hy, $hm, $hd);
        [$gy, $gm, $gd] = $this->julianToGregorian($jd);

        return Carbon::createFromDate($gy, $gm, $gd);
    }

    /**
     * Format a date according to calendar preference
     *
     * @param Carbon|string|\DateTime $date
     * @param string $calendarPreference 'gregorian', 'jalali', 'hijri_shamsi', 'hijri_qamari', 'shamsi', 'qamari'
     * @param string $format 'full', 'short', 'numeric'
     * @param string $language 'fa', 'ps', 'ar', 'en'
     * @return string
     */
    public function formatDate($date, string $calendarPreference, string $format = 'full', string $language = 'fa'): string
    {
        $carbon = $this->toCarbon($date);

        // Normalize calendar preference
        $calendar = $this->normalizeCalendarPreference($calendarPreference);

        switch ($calendar) {
            case 'hijri_shamsi':
            case 'jalali':
            case 'shamsi':
                $converted = $this->toJalali($carbon);
                return $this->formatJalaliDate($converted, $format, $language);

            case 'hijri_qamari':
            case 'qamari':
            case 'islamic':
                $converted = $this->toHijriQamari($carbon);
                return $this->formatHijriDate($converted, $format, $language);

            case 'gregorian':
            default:
                return $this->formatGregorianDate($carbon, $format, $language);
        }
    }

    /**
     * Get the current date in the specified calendar
     *
     * @param string $calendarPreference
     * @param string $format
     * @param string $language
     * @return string
     */
    public function getCurrentDate(string $calendarPreference, string $format = 'full', string $language = 'fa'): string
    {
        return $this->formatDate(Carbon::now(), $calendarPreference, $format, $language);
    }

    /**
     * Get date components for the specified calendar
     *
     * @param Carbon|string|\DateTime $date
     * @param string $calendarPreference
     * @return array{year: int, month: int, day: int, calendar: string}
     */
    public function getDateComponents($date, string $calendarPreference): array
    {
        $carbon = $this->toCarbon($date);
        $calendar = $this->normalizeCalendarPreference($calendarPreference);

        switch ($calendar) {
            case 'hijri_shamsi':
            case 'jalali':
            case 'shamsi':
                $result = $this->toJalali($carbon);
                $result['calendar'] = 'hijri_shamsi';
                return $result;

            case 'hijri_qamari':
            case 'qamari':
            case 'islamic':
                $result = $this->toHijriQamari($carbon);
                $result['calendar'] = 'hijri_qamari';
                return $result;

            case 'gregorian':
            default:
                return [
                    'year' => $carbon->year,
                    'month' => $carbon->month,
                    'day' => $carbon->day,
                    'calendar' => 'gregorian',
                ];
        }
    }

    /**
     * Convert numbers to Persian numerals
     */
    public function toPersianNumerals(string|int $number): string
    {
        $str = (string) $number;
        $result = '';
        for ($i = 0; $i < strlen($str); $i++) {
            $char = $str[$i];
            if (is_numeric($char)) {
                $result .= self::PERSIAN_NUMERALS[(int) $char];
            } else {
                $result .= $char;
            }
        }
        return $result;
    }

    /**
     * Convert numbers to Arabic numerals
     */
    public function toArabicNumerals(string|int $number): string
    {
        $str = (string) $number;
        $result = '';
        for ($i = 0; $i < strlen($str); $i++) {
            $char = $str[$i];
            if (is_numeric($char)) {
                $result .= self::ARABIC_NUMERALS[(int) $char];
            } else {
                $result .= $char;
            }
        }
        return $result;
    }

    /**
     * Check if a Jalali year is a leap year
     */
    public function isJalaliLeapYear(int $year): bool
    {
        $breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
        $jp = $breaks[0];
        $jump = 0;

        for ($i = 1; $i < count($breaks); $i++) {
            $jm = $breaks[$i];
            $jump = $jm - $jp;
            if ($year < $jm) {
                break;
            }
            $jp = $jm;
        }

        $n = $year - $jp;

        if ($jump - $n < 6) {
            $n = $n - $jump + intval(($jump + 4) / 33) * 33;
        }

        $leap = (intval(($n + 1) % 33) - 1) % 4;
        if ($leap === -1) {
            $leap = 4;
        }

        return $leap === 0;
    }

    /**
     * Check if a Hijri year is a leap year
     */
    public function isHijriLeapYear(int $year): bool
    {
        $cycle = $year % 30;
        $leapYears = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];
        return in_array($cycle, $leapYears);
    }

    // Private helper methods

    private function toCarbon($date): Carbon
    {
        if ($date instanceof Carbon) {
            return $date;
        }
        if ($date instanceof \DateTime) {
            return Carbon::instance($date);
        }
        return Carbon::parse($date);
    }

    private function normalizeCalendarPreference(string $preference): string
    {
        return match (strtolower(trim($preference))) {
            'jalali', 'shamsi', 'hijri_shamsi', 'solar', 'afghan' => 'hijri_shamsi',
            'qamari', 'hijri_qamari', 'islamic', 'lunar', 'hijri' => 'hijri_qamari',
            default => 'gregorian',
        };
    }

    private function formatJalaliDate(array $date, string $format, string $language): string
    {
        $year = $date['year'];
        $month = $date['month'];
        $day = $date['day'];

        // Get month name based on language
        $monthName = $language === 'ps'
            ? self::JALALI_MONTHS_PS[$month]
            : self::JALALI_MONTHS_FA[$month];

        switch ($format) {
            case 'numeric':
                $formatted = sprintf('%04d/%02d/%02d', $year, $month, $day);
                break;
            case 'short':
                $formatted = sprintf('%d %s %d', $day, $monthName, $year);
                break;
            case 'full':
            default:
                $formatted = sprintf('%d %s %d', $day, $monthName, $year);
                break;
        }

        // Convert numerals for RTL languages
        if (in_array($language, ['fa', 'ps', 'ar'])) {
            $formatted = $this->toPersianNumerals($formatted);
        }

        return $formatted;
    }

    private function formatHijriDate(array $date, string $format, string $language): string
    {
        $year = $date['year'];
        $month = $date['month'];
        $day = $date['day'];

        $monthName = self::HIJRI_MONTHS_AR[$month];

        switch ($format) {
            case 'numeric':
                $formatted = sprintf('%04d/%02d/%02d', $year, $month, $day);
                break;
            case 'short':
                $formatted = sprintf('%d %s %d', $day, $monthName, $year);
                break;
            case 'full':
            default:
                $formatted = sprintf('%d %s %d هـ', $day, $monthName, $year);
                break;
        }

        // Convert numerals for Arabic
        if ($language === 'ar') {
            $formatted = $this->toArabicNumerals($formatted);
        } elseif (in_array($language, ['fa', 'ps'])) {
            $formatted = $this->toPersianNumerals($formatted);
        }

        return $formatted;
    }

    private function formatGregorianDate(Carbon $date, string $format, string $language): string
    {
        switch ($format) {
            case 'numeric':
                return $date->format('Y-m-d');
            case 'short':
                return $date->format('d M Y');
            case 'full':
            default:
                return $date->format('F d, Y');
        }
    }

    private function gregorianToJulian(int $year, int $month, int $day): int
    {
        if ($month <= 2) {
            $year -= 1;
            $month += 12;
        }

        $A = intval($year / 100);
        $B = 2 - $A + intval($A / 4);

        return intval(365.25 * ($year + 4716)) + intval(30.6001 * ($month + 1)) + $day + $B - 1524;
    }

    private function julianToHijri(int $jd): array
    {
        $L = $jd - 1948440 + 10632;
        $N = intval(($L - 1) / 10631);
        $L = $L - 10631 * $N + 354;
        $J = intval((10985 - $L) / 5316) * intval((50 * $L) / 17719) + intval($L / 5670) * intval((43 * $L) / 15238);
        $L = $L - intval((30 - $J) / 15) * intval((17719 * $J) / 50) - intval($J / 16) * intval((15238 * $J) / 43) + 29;
        $month = intval((24 * $L) / 709);
        $day = $L - intval((709 * $month) / 24);
        $year = 30 * $N + $J - 30;

        return ['year' => $year, 'month' => $month, 'day' => $day];
    }

    private function hijriToJulian(int $year, int $month, int $day): int
    {
        return intval((11 * $year + 3) / 30) + 354 * $year + 30 * $month - intval(($month - 1) / 2) + $day + 1948440 - 385;
    }

    private function julianToGregorian(int $jd): array
    {
        $L = $jd + 68569;
        $N = intval((4 * $L) / 146097);
        $L = $L - intval((146097 * $N + 3) / 4);
        $I = intval((4000 * ($L + 1)) / 1461001);
        $L = $L - intval((1461 * $I) / 4) + 31;
        $J = intval((80 * $L) / 2447);
        $day = $L - intval((2447 * $J) / 80);
        $L = intval($J / 11);
        $month = $J + 2 - 12 * $L;
        $year = 100 * ($N - 49) + $I + $L;

        return [$year, $month, $day];
    }
}
