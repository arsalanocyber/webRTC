import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Home from "./components/Home";
import Test from "./components/Test";
import VideoCall from "./components/VideoCall";
import Login from "./components/Login";
import VideoCallWithScreenShare from "./components/VideoCallWithScreenShare";
import GroupVideoCall from "./components/GroupVideoCall";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/test" element={<Test />} />
        <Route path="/groupcalltest" element={<GroupVideoCall />} />
        <Route path="/videocall" element={<VideoCall />} />
        <Route
          path="/videocall-screenshare"
          element={<VideoCallWithScreenShare />}
        />
      </Routes>
    </Router>
  );
};

export default App;
