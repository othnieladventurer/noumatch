import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function Conversation() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      navigate(`/messages?conversation=${id}`, { replace: true });
    } else {
      navigate("/messages", { replace: true });
    }
  }, [id, navigate]);

  return null;
}

