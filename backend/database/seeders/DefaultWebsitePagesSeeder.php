<?php

namespace Database\Seeders;

use App\Models\SchoolBranding;
use App\Models\WebsitePage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DefaultWebsitePagesSeeder extends Seeder
{
    public function run(): void
    {
        // Get the first school to attach pages to
        $school = SchoolBranding::first();
        
        if (!$school) {
            $this->command->warn('No school found. Please create a school first.');
            return;
        }

        $pages = [
            [
                'title' => 'About Us',
                'slug' => 'about',
                'content_json' => $this->getAboutContent(),
                'seo_description' => 'Learn about our mission, vision, and values.',
                'status' => 'published',
            ],
            [
                'title' => 'Academics',
                'slug' => 'academics',
                'content_json' => $this->getAcademicsContent(),
                'seo_description' => 'Explore our academic programs and curriculum.',
                'status' => 'published',
            ],
            [
                'title' => 'Admissions',
                'slug' => 'admissions',
                'content_json' => $this->getAdmissionsContent(),
                'seo_description' => 'Information about our admissions process.',
                'status' => 'published',
            ],
            [
                'title' => 'News & Announcements',
                'slug' => 'news',
                'content_json' => $this->getNewsContent(),
                'seo_description' => 'Stay updated with our latest news and announcements.',
                'status' => 'published',
            ],
            [
                'title' => 'Fatwas & Islamic Rulings',
                'slug' => 'fatwas',
                'content_json' => $this->getFatwasContent(),
                'seo_description' => 'Islamic rulings and scholarly opinions.',
                'status' => 'published',
            ],
            [
                'title' => 'Contact Us',
                'slug' => 'contact',
                'content_json' => $this->getContactContent(),
                'seo_description' => 'Get in touch with us.',
                'status' => 'published',
            ],
        ];

        foreach ($pages as $pageData) {
            WebsitePage::updateOrCreate(
                [
                    'school_id' => $school->id,
                    'slug' => $pageData['slug'],
                ],
                [
                    'id' => Str::uuid(),
                    'organization_id' => $school->organization_id,
                    'title' => $pageData['title'],
                    'content_json' => $pageData['content_json'],
                    'seo_description' => $pageData['seo_description'],
                    'status' => $pageData['status'],
                    'published_at' => now(),
                    'created_by' => null,
                ]
            );
        }

        $this->command->info('Default website pages created successfully!');
    }

    private function getAboutContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Our Mission']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'We are dedicated to providing a comprehensive Islamic education that integrates traditional religious studies with modern academic excellence. Our mission is to nurture future leaders who are firmly grounded in their faith while being fully prepared to contribute positively to society.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Our Vision']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'To be a leading institution of Islamic learning, recognized globally for producing scholars, professionals, and community leaders who embody the values of knowledge, piety, and service to humanity.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Our Values']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Excellence'], ['type' => 'text', 'text' => ' - We strive for the highest standards in all aspects of education']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Integrity'], ['type' => 'text', 'text' => ' - We uphold honesty and strong moral principles']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Compassion'], ['type' => 'text', 'text' => ' - We nurture empathy and care for all members of our community']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Knowledge'], ['type' => 'text', 'text' => ' - We believe in the pursuit of knowledge as a lifelong journey']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Service'], ['type' => 'text', 'text' => ' - We are committed to serving our community and beyond']]]]],
                    ]
                ],
            ]
        ];
    }

    private function getAcademicsContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Our Curriculum']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'Our academic program combines traditional Islamic sciences with contemporary subjects, providing students with a well-rounded education that prepares them for success in both religious and worldly pursuits.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Islamic Studies']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Quran & Tajweed'], ['type' => 'text', 'text' => ' - Memorization and correct recitation of the Holy Quran']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Hadith Sciences'], ['type' => 'text', 'text' => ' - Study of Prophetic traditions and their applications']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Fiqh'], ['type' => 'text', 'text' => ' - Islamic jurisprudence and practical rulings']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Arabic Language'], ['type' => 'text', 'text' => ' - Classical and modern Arabic language studies']]]]],
                    ]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Academic Programs']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Full-time Alim/Alimah Course'], ['type' => 'text', 'text' => ' - Comprehensive 7-year program']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Hifz Program'], ['type' => 'text', 'text' => ' - Quran memorization track']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Weekend Islamic School'], ['type' => 'text', 'text' => ' - For working professionals']]]]],
                    ]
                ],
            ]
        ];
    }

    private function getAdmissionsContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Admission Process']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'We welcome students from all backgrounds who are sincere in their pursuit of Islamic knowledge. Our admissions process is designed to identify students who will thrive in our academic environment.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Requirements']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Completed application form']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Previous academic records']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Letter of recommendation']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Entrance assessment (if applicable)']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Interview with admissions committee']]]]],
                    ]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Apply Now']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'Ready to begin your journey with us? Contact our admissions office or visit us in person to learn more about our programs and start your application.']]
                ],
            ]
        ];
    }

    private function getNewsContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Latest News & Announcements']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'Stay updated with the latest happenings at our institution. Check back regularly for important announcements, event updates, and community news.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Upcoming Events']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'We regularly host lectures, seminars, and community events. Visit this page often to stay informed about upcoming activities.']]
                ],
            ]
        ];
    }

    private function getFatwasContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Islamic Rulings & Guidance']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'Our scholars provide reliable Islamic rulings (fatwas) based on authentic sources and traditional scholarship. Browse our collection of answered questions or submit your own inquiry.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Categories']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Worship (Ibadah)'], ['type' => 'text', 'text' => ' - Prayer, fasting, zakat, and hajj']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Family Matters'], ['type' => 'text', 'text' => ' - Marriage, divorce, and inheritance']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Business & Finance'], ['type' => 'text', 'text' => ' - Islamic guidelines for transactions']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Daily Life'], ['type' => 'text', 'text' => ' - Food, clothing, and social interactions']]]]],
                    ]
                ],
            ]
        ];
    }

    private function getContactContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Get in Touch']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'We\'d love to hear from you. Whether you have questions about our programs, want to schedule a visit, or simply want to learn more about our institution, please don\'t hesitate to reach out.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Contact Information']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Address:'], ['type' => 'text', 'text' => ' 123 Islamic Center Drive, City, State 12345']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Phone:'], ['type' => 'text', 'text' => ' +1 (555) 123-4567']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Email:'], ['type' => 'text', 'text' => ' info@school.edu']]]]],
                        ['type' => 'listItem', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'Office Hours:'], ['type' => 'text', 'text' => ' Monday - Friday, 8:00 AM - 5:00 PM']]]]],
                    ]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'Visit Us']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'We welcome prospective students and families to visit our campus. Please contact our admissions office to schedule a tour and learn more about our programs firsthand.']]
                ],
            ]
        ];
    }
}
