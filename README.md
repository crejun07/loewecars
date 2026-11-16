# loewe crm

Act as an expert in business operations, CRM systems, and advanced Notion workspace design. I want you to build a complete, professional internal system for a car trading company (buying and selling vehicles), structured like a custom app inside Notion.

The system must be highly organized, visual, scalable, and easy to use on a daily basis. Use interconnected databases, clear workflows, and practical automation logic.

Create the following databases with full detail (properties, relations, views, and statuses):

DATABASE: CLIENTS
Properties:

Full Name (Title)

Phone Number

Email

Client Type (Seller / Buyer / Both)

Status (New, In Follow-up, Closed)

Notes

Relation to "Vehicle Appraisals"

Relation to "Sales"

DATABASE: VEHICLE APPRAISALS (CAR ACQUISITION)
Purpose: Track customers who want to sell their cars.

Properties:

Client (Relation to Clients)

Brand

Model

Year

Mileage

Fuel Type

Vehicle Condition

Estimated Price

Offered Price

Deal Status (Pending, Offer Sent, Negotiating, Purchased, Rejected)

Follow-up Date

Notes

Views:

Kanban board by Deal Status

Table view for full management

DATABASE: SALES (CUSTOMER PURCHASES)
Purpose: Track customers interested in buying vehicles.

Properties:

Client (Relation to Clients)

Interested Vehicle (Relation to Stock)

Customer Budget

Sales Status (New Lead, Interested, Test Drive Done, Negotiating, Reserved, Sold, Lost)

Next Contact Date

Payment Method

Notes

Views:

Kanban board by Sales Status

Calendar for follow-ups

DATABASE: VEHICLE STOCK
Purpose: Manage all available cars.

Properties:

Brand

Model

Year

Mileage

Purchase Price

Selling Price

Profit Margin (Formula: Selling Price - Purchase Price)

Status (Preparing, Available, Reserved, Sold)

Entry Date

Next ITV Date (inspection deadline)

Location

Relation to "Workshop"

Relation to "Sales"

Views:

Gallery view (visual inventory)

Table view (detailed control)

Filter: Available cars only

DATABASE: WORKSHOP (REPAIRS & PREPARATION)
Purpose: Track all work done on vehicles.

Properties:

Vehicle (Relation to Stock)

Task (e.g. oil change, paint, inspection)

Date

Status (Pending, In Progress, Completed, Waiting for Parts)

Cost

Description

Views:

Kanban by Status

Timeline view for workload

AUTOMATIONS & SMART FEATURES
Include:

Formula to automatically calculate profit margin

Visual alert system for upcoming ITV dates (e.g. within 30 days)

Follow-up indicators for clients with overdue contact dates

Status-based color coding for quick decision making

MAIN DASHBOARD (IMPORTANT)
Create a main page that works like a control panel for the business.

It must include:

Quick access buttons to all databases

View of available vehicles (stock)

Pending workshop tasks

Clients needing follow-up

Active deals (both purchases and sales)

Design it clean, minimal, and efficient, like a real business app.

IMPORTANT REQUIREMENTS:

Use Kanban views for all pipeline-style processes

Use relational databases properly (everything must be connected)

Keep naming clear, professional, and consistent

Optimize for speed and daily usage in a real car dealership environment

Avoid unnecessary complexity, but keep it powerful and scalable

The final result should feel like a custom-built dealership management software inside Notion.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://loewecars.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/05a10f68-9a72-453e-b3b9-375faeff1a13).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
