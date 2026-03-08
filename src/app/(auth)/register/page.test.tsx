import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-auth/react before component import
jest.mock("next-auth/react", () => ({
    signIn: jest.fn(),
}));

// Mock framer-motion
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
    register: jest.fn(),
}));

import RegisterPage from "./page";
import { signIn } from "next-auth/react";

describe("RegisterPage UI Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockState = [undefined, mockFormAction, false];
    });

    it("renders the register form with heading, inputs, and submit button", () => {
        render(<RegisterPage />);

        expect(screen.getByText("Join MooW Today!")).toBeInTheDocument();
        expect(screen.getByLabelText("Username")).toBeInTheDocument();
        expect(screen.getByLabelText("Choose Password")).toBeInTheDocument();
        expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
        expect(screen.getByText("Create Account")).toBeInTheDocument();
    });

    it("enforces minLength 6 on password input", () => {
        render(<RegisterPage />);
        const passwordInput = screen.getByLabelText("Choose Password");
        expect(passwordInput).toHaveAttribute("minLength", "6");
    });

    it("displays error message when registration fails", () => {
        mockState = ["Username is already taken.", mockFormAction, false];

        render(<RegisterPage />);
        expect(screen.getByText("Username is already taken.")).toBeInTheDocument();
    });

    it("disables submit button while form is pending", () => {
        mockState = [undefined, mockFormAction, true];

        render(<RegisterPage />);
        const buttons = screen.getAllByRole("button");
        const submitButton = buttons.find((b) => b.getAttribute("type") === "submit");
        expect(submitButton).toBeDisabled();
    });

    it("calls Google OAuth signIn when Google button clicked", () => {
        render(<RegisterPage />);

        const googleButton = screen.getByText("Continue with Google").closest("button")!;
        fireEvent.click(googleButton);
        expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
    });

    it("calls GitHub OAuth signIn when GitHub button clicked", () => {
        render(<RegisterPage />);

        const githubButton = screen.getByText("Continue with GitHub").closest("button")!;
        fireEvent.click(githubButton);
        expect(signIn).toHaveBeenCalledWith("github", { callbackUrl: "/" });
    });

    it("renders sign-in link to login page", () => {
        render(<RegisterPage />);
        const signInLink = screen.getByText(/Sign in here/i);
        expect(signInLink).toBeInTheDocument();
        expect(signInLink.closest("a")).toHaveAttribute("href", "/login");
    });
});
