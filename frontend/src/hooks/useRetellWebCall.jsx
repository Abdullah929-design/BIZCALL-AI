import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { RetellWebClient } from 'retell-client-js-sdk';

export function useRetellWebCall() {
    const [callStatus, setCallStatus] = useState('Idle');
    const [isCalling, setIsCalling] = useState(false);
    const [activeCallId, setActiveCallId] = useState(null);
    const retellWebClientRef = useRef(null);

    useEffect(() => {
        try {
            const client = new RetellWebClient();
            retellWebClientRef.current = client;

            client.on('call_started', () => {
                setCallStatus('🎙️ Call Active - Speaking Live');
            });

            client.on('call_ended', () => {
                setCallStatus('Idle');
                setIsCalling(false);
                setActiveCallId(null);
            });

            client.on('error', (err) => {
                console.error('WebRTC Error:', err);
                setCallStatus('Error');
                setIsCalling(false);
            });
        } catch (e) {
            console.error('Failed to initialize Retell SDK:', e);
        }

        return () => {
            if (retellWebClientRef.current) {
                retellWebClientRef.current.stopCall();
            }
        };
    }, []);

    const startWebCall = async (agentId) => {
        if (isCalling) return;
        setCallStatus('Connecting…');
        setIsCalling(true);

        try {
            const res = await axios.post('/api/retell/register-call', { agent_id: agentId });
            if (res.data?.success && res.data.call_data?.access_token) {
                const { access_token, call_id } = res.data.call_data;
                setActiveCallId(call_id);
                await retellWebClientRef.current.startCall({ accessToken: access_token });
                return call_id;
            } else {
                throw new Error('Failed to register web call');
            }
        } catch (err) {
            setCallStatus('Error');
            setIsCalling(false);
            throw err;
        }
    };

    const stopWebCall = async () => {
        if (retellWebClientRef.current) {
            retellWebClientRef.current.stopCall();
        }
        setCallStatus('Idle');
        setIsCalling(false);
        setActiveCallId(null);
    };

    return {
        callStatus,
        isCalling,
        activeCallId,
        startWebCall,
        stopWebCall
    };
}
