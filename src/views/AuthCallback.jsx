import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, Hourglass, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AuthCallback = () => {
    const { session, loading } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const needsConfirmation = searchParams.get('confirm') === 'true';

    useEffect(() => {
        if (!loading && session) {
            // User just logged in via magic link/oauth
            setTimeout(() => {
                navigate('/');
            }, 2000); // Redirect after a short delay
        }
    }, [session, loading, navigate]);
    
    // If user is not logged in and came here after sign up
    if (!loading && !session) {
        return (
            <>
                <Helmet>
                    <title>Confirm Your Email - HealthTracker</title>
                    <meta name="description" content="Check your email to confirm your account." />
                </Helmet>
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-10 rounded-2xl shadow-lg max-w-lg"
                    >
                        <MailCheck className="w-16 h-16 mx-auto text-emerald-500 mb-6" />
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Check your inbox!</h1>
                        <p className="text-slate-600 mb-8">
                            We've sent a verification link to your email address. Please click the link to activate your account.
                        </p>
                        <Button asChild>
                            <Link to="/login">
                                <LogIn className="mr-2 h-4 w-4" /> Go to Login
                            </Link>
                        </Button>
                    </motion.div>
                </div>
            </>
        );
    }
    
    // If user is logged in but needs to confirm email (e.g. tried to access a protected route)
    if (!loading && session && needsConfirmation) {
        return (
            <>
                <Helmet>
                    <title>Confirmation Required - HealthTracker</title>
                    <meta name="description" content="Please confirm your email to continue." />
                </Helmet>
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-10 rounded-2xl shadow-lg max-w-lg"
                    >
                        <MailCheck className="w-16 h-16 mx-auto text-amber-500 mb-6" />
                        <h1 className="text-3xl font-bold text-slate-800 mb-2">Email Verification Required</h1>
                        <p className="text-slate-600">
                            Your email is not verified yet. Please check your inbox for the confirmation link to access all features.
                        </p>
                    </motion.div>
                </div>
            </>
        )
    }

    // Default loading/redirecting state
    return (
        <>
            <Helmet>
                <title>Authenticating... - HealthTracker</title>
            </Helmet>
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white p-10 rounded-2xl shadow-lg max-w-lg"
                >
                    <Hourglass className="w-16 h-16 mx-auto text-emerald-500 mb-6 animate-spin" />
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Authenticating...</h1>
                    <p className="text-slate-600">
                        Please wait while we log you in. You will be redirected shortly.
                    </p>
                </motion.div>
            </div>
        </>
    );
};

export default AuthCallback;