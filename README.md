# Project: Flask-React Full Stack Application

This project is a full-stack web application built with a Flask backend and a React frontend. It utilizes PostgreSQL for the database, and is designed to be a minimal template for future development.

## Tools and Libraries Used

**Backend:**

*   **Flask:** A lightweight Python web framework for building the API.
*   **PostgreSQL:** A powerful, open-source relational database for storing application data.
*   **psycopg2:** A PostgreSQL adapter for Python, enabling database interaction.
*   **pip:** A package installer for Python.

**Frontend:**

*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A superset of JavaScript that adds static typing.
*   **Vite:** A build tool that aims to provide a faster and leaner development experience for modern web projects.
*   **TailwindCSS:** A utility-first CSS framework for rapidly building custom designs.
*   **react-icons:** An icon library for React, providing a wide range of icon sets.
* **npm**: Node package manager.

## Getting Started

### Prerequisites

1.  **PostgreSQL:** You must have PostgreSQL installed and running on your system before starting the project.
    *   You can start it with a command like `pg_ctl -D /usr/local/var/postgres start` on macOS, or using the appropriate service manager on your OS.
2.  **Python 3**: Make sure you have python3 installed in your machine.
3. **NodeJS**: Make sure you have NodeJS and npm installed in your machine.

## Getting Started

### Running the Project

1.  **Install Backend Dependencies**:
    *   Navigate to the `backend/` directory: `cd backend`
    *   Install the requirements: `python3 -m pip install -r requirements.txt`
2.  **Run the devserver**: Run the `devserver.sh` script from the project root directory:

```sh
./devserver.sh
```