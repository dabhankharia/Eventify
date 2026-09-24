import React from 'react';
import { Search } from 'lucide-react';

export default function Hero({ searchQuery, setSearchQuery, selectedCategory, setSelectedCategory }) {
    const categories = ['All', 'Tech', 'Music', 'Business', 'Workshops'];

    return (
        <div className="hero-banner">
            <div className="hero-content">

                <h1 className="hero-title">Experience Unforgettable Events</h1>
                <p className="hero-subtitle">
                    Discover premier tech summits, music festivals, venture conclaves, and hands-on developer workshops across India.
                </p>

                <div className="search-filter-box">
                    <div className="search-input-wrapper">
                        <Search size={20} color="var(--text-subtle)" />
                        <input
                            type="text"
                            placeholder="Search events by title, venue, city (Bengaluru, Goa, Mumbai...), or keyword..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="category-pills">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
