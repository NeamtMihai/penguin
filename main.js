import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { startGame } from "./game.js";

const SUPABASE_URL = 'https://rkqeuzipsxjabfnhytlg.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_6Ka6cIBxZgvXFPE7uuCdpw_USMpv1vx'

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


const authScreen = document.getElementById('auth-screen');
const errorEl = document.getElementById('auth-error');

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // ✅ Logged in
        authScreen.style.display = 'none';
        startGame(session.user);
    } else {
        // ❌ Not logged in
        authScreen.style.display = 'flex';
    }
}

document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        errorEl.textContent = error.message;
    } else {
        checkAuth();
    }
};

document.getElementById('register-btn').onclick = async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        errorEl.textContent = error.message;
    } else {
        checkAuth();
    }
};

checkAuth();
