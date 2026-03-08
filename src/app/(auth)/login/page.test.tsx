import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Ngetes UI doang

jest.mock("next-auth/react", () => ({
    signIn: jest.fn(),
}));

jest.mock("framer-motion", () => {
    const React = require("react");
    const MotionDiv = React.forwardRef((props: any, ref: any) => {
        const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
        return React.createElement("div", { ref, ...rest });
    });
    MotionDiv.displayName = "MotionDiv";
    return {
        motion: { div: MotionDiv },
        AnimatePresence: ({ children }: any) => children,
    };
});

jest.mock("lucide-react", () => {
    const React = require("react");
    return new Proxy({}, {
        get: function (_target, prop) {
            return (props: any) => React.createElement("svg", { ...props, "data-testid": prop }, prop);
        }
    });
});

jest.mock("../auth.module.css", () => new Proxy({}, { get: (_t, prop) => prop }));

const mockFormAction = jest.fn();
let mockState: [string | undefined, typeof mockFormAction, boolean] = [undefined, mockFormAction, false];

jest.mock("react", () => ({
    ...jest.requireActual("react"),
    useActionState: jest.fn(() => mockState),
}));

jest.mock("../actions", () => ({
    authenticate: jest.fn(),
}));

import LoginPage from "./page";
import { signIn } from "next-auth/react";

describe("LoginPage UI Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockState = [undefined, mockFormAction, false];
    });

    it("renders the login form with heading, inputs, and submit button", () => {
        render(<LoginPage />);

        expect(screen.getByText("Welcome Back!")).toBeInTheDocument();
        expect(screen.getByLabelText("Username")).toBeInTheDocument();
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
        expect(screen.getByText("Sign In")).toBeInTheDocument();
    });

    it("displays error message when authentication fails", () => {
        mockState = ["Invalid credentials.", mockFormAction, false];

        render(<LoginPage />);
        expect(screen.getByText("Invalid credentials.")).toBeInTheDocument();
    });

    it("disables submit button while form is pending", () => {
        mockState = [undefined, mockFormAction, true];

        render(<LoginPage />);
        const buttons = screen.getAllByRole("button");
        const submitButton = buttons.find((b) => b.getAttribute("type") === "submit");
        expect(submitButton).toBeDisabled();
    });

    it("calls Google OAuth signIn when Google button clicked", () => {
        render(<LoginPage />);

        const googleButton = screen.getByText("Continue with Google").closest("button")!;
        fireEvent.click(googleButton);
        expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
    });

    it("calls GitHub OAuth signIn when GitHub button clicked", () => {
        render(<LoginPage />);

        const githubButton = screen.getByText("Continue with GitHub").closest("button")!;
        fireEvent.click(githubButton);
        expect(signIn).toHaveBeenCalledWith("github", { callbackUrl: "/" });
    });

    it("renders sign-up link to register page", () => {
        render(<LoginPage />);
        const signUpLink = screen.getByText(/Sign Up for free/i);
        expect(signUpLink).toBeInTheDocument();
        expect(signUpLink.closest("a")).toHaveAttribute("href", "/register");
    });
});
