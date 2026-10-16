# الدلوعة — AL DALOUAA (متجر إلكتروني كامل)
# AL DALOUAA | الدلوعة

### Full-Stack E-Commerce Platform

**AL DALOUAA** is a full-stack e-commerce platform designed to provide a seamless online shopping experience for women's fashion, sleepwear, beauty products, and accessories. The platform combines a customer-facing storefront with an integrated administration dashboard for managing products, orders, customers, payments, and shipping.

The website supports Arabic and English, with product prices displayed in Egyptian pounds (EGP).

## Project Overview

AL DALOUAA brings the essential operations of an online store into one platform. Customers can browse products, explore categories, manage their shopping carts and wishlists, and place orders through the available payment methods. Administrators can manage store inventory, process orders, review payment information, and configure shipping policies through a dedicated dashboard.

## Key Features

### Customer Storefront

- **Bilingual Interface:** Arabic and English language support across the shopping experience.
- **Product Catalog:** Organized product listings with descriptions, pricing, product images, and category information.
- **Product Variants:** Support for product options such as sizes, colors, and scents.
- **Shopping Cart:** A centralized cart for reviewing selected products before checkout.
- **Wishlist:** A dedicated space for saving favorite products.
- **Checkout:** Order placement with customer details, delivery address, shipping information, and server-calculated totals.
- **Flexible Payments:** Cash on Delivery and Vodafone Cash.
- **Google Sign-In:** Google account authentication when the required credentials are configured.
- **Shipping Information:** Shipping charges and free-shipping eligibility based on store settings.

### Admin Dashboard

The administration dashboard provides centralized management of the store's main operations.

- **Product Management:** Create and update products, including bilingual names and descriptions, prices, previous prices, categories, and stock quantities.
- **Image Management:** Upload multiple product images, reorder them, select a primary image, and remove images.
- **Order Management:** Review customer information, delivery addresses, ordered products, selected variants, and order status.
- **Payment Management:** Review Vodafone Cash transaction references and payment proof, then update payment status.
- **Customer Management:** Access customer records and review their orders, purchase totals, shopping carts, and wishlists.
- **Category Management:** Organize products into store categories.
- **Variant Management:** Manage available sizes and colors.
- **Shipping Management:** Configure shipping regions, adjust delivery charges, and enable or disable regions.
- **Free Shipping Configuration:** Control free-shipping availability and the minimum qualifying order subtotal.
- **Store Analytics:** Access dashboard statistics for an overview of store activity.
- **Order Notifications:** Receive notifications for newly placed orders through the administration dashboard.

### Payments & Shipping

The platform supports two payment methods:

- Cash on Delivery.
- Vodafone Cash.

Visa and Mastercard payments are not supported.

Shipping charges are managed through the administration dashboard. The platform also supports configurable free-shipping rules, allowing the store to adjust the minimum qualifying order subtotal without relying solely on a fixed value in the application configuration.

### Authentication & Security

The platform includes authentication and server-side validation mechanisms designed to protect store operations.

- User authentication and role-based administrative access.
- Server-side validation of prices, inventory, and order totals.
- Google identity token verification when Google Sign-In is enabled.
- Image upload validation.
- Login attempt restrictions and duplicate-account prevention measures.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Customer-facing interface and admin dashboard |
| Vite | Frontend development and build tooling |
| Express.js | Backend API and application logic |
| Node.js | Backend runtime |
| Prisma ORM | Database access and schema management |
| MySQL | Relational database |
| Docker Compose | Optional local database environment |

## Application Architecture

AL DALOUAA follows a frontend-backend architecture that separates the user interface from server-side operations.

- **Frontend Layer:** Handles product browsing, shopping interactions, account interfaces, checkout screens, and administration pages.
- **Backend Layer:** Processes API requests, authentication, product and order operations, inventory validation, payment information, and shipping calculations.
- **Database Layer:** Stores application data, including users, products, product images, orders, store settings, and related records.

This separation helps keep business logic and important validation on the server while providing a responsive interface for customers and administrators.

## Brand Identity

**Brand:** AL DALOUAA — الدلوعة

**Homepage tagline:**

لينا جوا كل بيت حكاية

ثقة منذ 1995

**English version:**

*A story in every home.*

*Trusted since 1995.*

## Project Goals

- Deliver a convenient online shopping experience.
- Provide an organized system for managing products and inventory.
- Simplify order processing and payment review.
- Give administrators control over shipping policies and store settings.
- Support Arabic-speaking and English-speaking customers through a bilingual interface.
- Maintain a clear separation between the storefront, backend services, and database.

---

**AL DALOUAA — Bringing style, convenience, and a seamless shopping experience together.**