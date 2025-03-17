import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Aurora from './Aurora';
import ShinyText from './ShinyText';
import Particles from './Particles';
import GradientText from './GradientText'
import "./App.css";

const socket = io("hserver-emdmhzb4bgfcf6ac.eastus-01.azurewebsites.net", {
  transports: ["websocket", "polling"]
});
; // Replace with your server URL

function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const [waitingUsers, setWaitingUsers] = useState(0);
  const [isSearching, setIsSearching] = useState(false); // Tracks if user is in queue

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideoRef.current.srcObject = stream;
      })
      .catch((error) => console.error("Error accessing media devices:", error));

    socket.on("waitingUsers", (count) => {
      setWaitingUsers(count); // Update waiting user count in state
    });

    socket.on("waitingInQueue", () => {
      setIsSearching(true); // Show loading when user is waiting
    });

    socket.on("matchFound", async (partnerId) => {
      setIsSearching(false); // Stop loading when connected
      peerConnection.current = createPeerConnection();

      // Send offer to the matched user
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit("offer", { targetId: partnerId, offer });
    });

    socket.on("offer", async ({ targetId, offer }) => {
      peerConnection.current = createPeerConnection();
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answer", { targetId, answer });
    });

    socket.on("answer", async ({ answer }) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("candidate", async ({ candidate }) => {
      if (peerConnection.current.remoteDescription) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

  }, []);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", { candidate: event.candidate });
      }
    };

    return pc;
  };

  const findNewStranger = () => {
    socket.emit("findStranger");
  };

  return (
    <div>
      {/* Background Particles */}
      <Particles
        particleColors={['#861F41', '#E5751F']}
        particleCount={1000}
        particleSpread={10}
        speed={0.1}
        particleBaseSize={100}
        moveParticlesOnHover={true}
        alphaParticles={true}
        disableRotation={true}
      />

      {/* Foreground Content */}
      <Aurora colorStops={["#861F41", "#E5751F", "#861F41"]} blend={0.5} amplitude={1.0} speed={0.5} />
      <ShinyText text="Hokieverse" disabled={false} speed={3} className='text-shiny' />

      <div className="video-container">
        <video ref={localVideoRef} autoPlay playsInline className="video" />
        <video ref={remoteVideoRef} autoPlay playsInline className="video" />
      </div>

      {/* Display number of waiting users */}
      <GradientText
        colors={["#861F41", "#E5751F", "#642667", "#CE0058", "#F7EA48"]}
        animationSpeed={8}
        showBorder={false}
        className="waiting-users"
      >
      Hokies online: {waitingUsers}
      </GradientText>

      {/* Find a stranger button with loading state */}
      <div
        className={`shiny-button ${isSearching ? "loading" : ""}`}
        onClick={isSearching ? null : findNewStranger}
      >
        <ShinyText text={isSearching ? "Searching..." : "Find a Stranger"} speed={3} />
      </div>
    </div>
  );
}

export default App;
