import React, { useState, useEffect } from "react";
import { login, changePassword } from "../../services/authService";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2 } from "lucide-react";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Clear errors when input changes
    setUsernameError("");
    setPasswordError("");
    setError("");
  }, [username, password]);

  const validateForm = (): boolean => {
    let isValid = true;

    if (!username) {
      setUsernameError("Username is required");
      isValid = false;
    } else if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login form submitted with:', { username, password });

    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      console.log('Calling login API...');
      const response = await login(username, password);
      console.log('Login response:', response);

      if (response.mustChangePassword) {
        console.log('Must change password');
        setMustChangePassword(true);
      } else {
        console.log('Login successful, redirecting...');
        // Check if user is admin and redirect to admin portal
        if (response.user?.role === 'admin') {
          console.log('Redirecting to admin portal');
          navigate("/admin", { replace: true });
        } else {
          // Get the redirect path from location state or default to home for regular users
          const from = (location.state as any)?.from?.pathname || "/";
          console.log('Redirecting to:', from);
          navigate(from, { replace: true });
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Enhanced password validation
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    // Check for additional password requirements
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasUppercaseOrNumber = /[A-Z]/.test(newPassword) || /\d/.test(newPassword);
    const hasSpecialChar = /[@#$%^&*+=|\\(){}:;",<.?/]/.test(newPassword);
    const noCommonWords = !/password|admin|123456|qwerty/i.test(newPassword);

    if (!hasLowercase || !hasUppercaseOrNumber || !hasSpecialChar || !noCommonWords) {
      setError("Password must contain lowercase letters, uppercase letters or numbers, special characters, and no common words");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      await changePassword(username, password, newPassword);

      // Get the redirect path from location state or default to home
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Password change failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password validation functions
  const getPasswordRequirements = (password: string) => {
    return {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercaseOrNumber: /[A-Z]/.test(password) || /\d/.test(password),
      specialChar: /[@#$%^&*+=|\\(){}:;",<.?/]/.test(password),
      noCommonWords: !/password|admin|123456|qwerty/i.test(password)
    };
  };

  if (mustChangePassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
                <span className="text-3xl">🔑</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Password Change Required
            </h2>
              <p className="text-sm text-gray-600">
                You must change your temporary password before continuing
            </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative mt-1">
                <Input
                  id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-12"
                  placeholder="Enter new password"
                  required
                />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showNewPassword ? (
                      <span className="text-lg">🙈</span>
                    ) : (
                      <span className="text-lg">👁️</span>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm New Password
                </Label>
                <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-12"
                  placeholder="Confirm new password"
                  required
                />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <span className="text-lg">🙈</span>
                    ) : (
                      <span className="text-lg">👁️</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements with Visual Feedback */}
              <div className="text-sm bg-blue-50 p-4 rounded border border-blue-200">
                <p className="font-medium mb-3 text-blue-800">Password Requirements:</p>
                {(() => {
                  const requirements = getPasswordRequirements(newPassword);
                  return (
                    <div className="space-y-2">
                      <div className={`flex items-center space-x-2 ${requirements.length ? 'text-green-700' : 'text-gray-600'}`}>
                        <span className="text-lg">{requirements.length ? '✅' : '❌'}</span>
                        <span>At least 8 characters long</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${requirements.lowercase ? 'text-green-700' : 'text-gray-600'}`}>
                        <span className="text-lg">{requirements.lowercase ? '✅' : '❌'}</span>
                        <span>Contains lowercase letters</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${requirements.uppercaseOrNumber ? 'text-green-700' : 'text-gray-600'}`}>
                        <span className="text-lg">{requirements.uppercaseOrNumber ? '✅' : '❌'}</span>
                        <span>Contains uppercase letters or numbers</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${requirements.specialChar ? 'text-green-700' : 'text-gray-600'}`}>
                        <span className="text-lg">{requirements.specialChar ? '✅' : '❌'}</span>
                        <span>Contains at least one special character (@#$%^&*+=)</span>
                      </div>
                      <div className={`flex items-center space-x-2 ${requirements.noCommonWords ? 'text-green-700' : 'text-gray-600'}`}>
                        <span className="text-lg">{requirements.noCommonWords ? '✅' : '❌'}</span>
                        <span>No common words (password, admin, 123456, etc.)</span>
                      </div>
                      {newPassword && confirmPassword && (
                        <div className={`flex items-center space-x-2 ${newPassword === confirmPassword ? 'text-green-700' : 'text-red-600'}`}>
                          <span className="text-lg">{newPassword === confirmPassword ? '✅' : '❌'}</span>
                          <span>New passwords match</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">⚠️</span>
                  <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Changing Password...</span>
                  </div>
                ) : (
                  "Change Password"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-[1400px] flex items-stretch bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Left side - Logo Section */}
        <div className="w-[45%] bg-white p-12 flex items-center justify-center">
          <img
            src="/itc-pspd-logo.jpg"
            alt="ITC PSPD Logo"
            className="w-full max-w-[600px] object-contain"
          />
        </div>

        {/* Right side - Login Form */}
        <div className="flex-1 bg-white border-l border-gray-100 p-12">
          <div className="max-w-[600px] mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Sign in to your account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label
                  htmlFor="username"
                  className="text-lg font-medium text-gray-700"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className={`mt-2 h-12 text-lg ${
                    usernameError ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter your username"
                />
                {usernameError && (
                  <p className="mt-1 text-sm text-red-600">{usernameError}</p>
                )}
              </div>

              <div>
                <Label
                  htmlFor="password"
                  className="text-lg font-medium text-gray-700"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={`mt-2 h-12 text-lg ${
                    passwordError ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter your password"
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg font-medium bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>

              <p className="text-center text-gray-600">
                Don't have an account?{" "}
                <a
                  href="/register"
                  className="font-semibold text-primary hover:text-primary/80"
                >
                  Register here
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
