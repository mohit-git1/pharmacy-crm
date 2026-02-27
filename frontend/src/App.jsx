import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import "./App.css";

function App() {
    return (
        <BrowserRouter>
            <div className="app-layout">
                <Sidebar />
                <main className="main-area">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/inventory" element={<Inventory />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;
