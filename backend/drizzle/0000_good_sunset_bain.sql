CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(50) DEFAULT 'Attendee' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"date" varchar(50) NOT NULL,
	"time" varchar(100) NOT NULL,
	"location" varchar(255) NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"available_seats" integer DEFAULT 100 NOT NULL,
	"total_seats" integer DEFAULT 100 NOT NULL,
	"organizer" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"banner_gradient" text,
	"badge" varchar(50) DEFAULT 'Upcoming',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"ticket_code" varchar(100) NOT NULL,
	"user_id" varchar(64) NOT NULL,
	"event_id" varchar(64) NOT NULL,
	"ticket_tier" varchar(100) DEFAULT 'General Admission' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_per_ticket" integer NOT NULL,
	"total_price" integer NOT NULL,
	"payment_method" varchar(100) NOT NULL,
	"payment_id" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'CONFIRMED' NOT NULL,
	"booked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_ticket_code_unique" UNIQUE("ticket_code")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;