# Desktop Helper

Desktop Helper is an Electron-based application that captures the screen and sends the captured image along with a user query to OpenAI's API for analysis. This README provides instructions on how to set up and use the application.

## Features

- Capture screenshots of your desktop
- Send the captured screenshot to OpenAI's API along with a user query
- Display the API's response in real-time
- Configure API settings (API key, host, model, etc.) through a settings modal

## Prerequisites

- Node.js (v14.x or later)
- npm (v6.x or later)

## Installation

1. **Clone the repository:**

    ```sh
    git clone https://github.com/fatherxtreme123/FatherDesktopHelper.git
    cd FatherDesktopHelper
    ```

2. **Install dependencies:**

    ```sh
    npm install
    ```

3. **Run the application:**

    ```sh
    npm start
    ```

## Usage

1. **Start the application:**

   Run the following command to start the application:

   ```sh
   npm start
   ```

2. **Capture a screenshot:**

   - Type your query into the input field.
   - Click the "Enter" button or press "Enter" to capture the screen and send the query.

3. **Configure API settings:**

   - Click the "Settings" button to open the settings modal.
   - Enter your API key, API host, model, temperature, top P, presence penalty, and frequency penalty.
   - Click the "Save" button to save your settings.

## Files and Directories

- `index.html`: The main HTML file for the application.
- `style.css`: The main CSS file for the application.
- `script.js`: The main JavaScript file for the application, responsible for UI interactions and communication with the API.
- `main.js`: The Electron main process file, responsible for creating the application window and handling IPC communication.
- `settings.json`: A JSON file where API settings are stored.
