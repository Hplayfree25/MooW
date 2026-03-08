import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorModal } from '@/components/ErrorModal';

describe('ErrorModal Component', () => {
    it('renders nothing when isOpen is false', () => {
        const { container } = render(<ErrorModal isOpen={false} message="Test error" onClose={() => { }} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders modal with correct message when isOpen is true', () => {
        render(<ErrorModal isOpen={true} message="Critical Database Error" onClose={() => { }} />);
        expect(screen.getByText('Database Error')).toBeInTheDocument();
        expect(screen.getByText('Critical Database Error')).toBeInTheDocument();
    });

    it('calls onClose when Dismiss button is clicked', () => {
        const handleClose = jest.fn();
        render(<ErrorModal isOpen={true} message="Test error" onClose={handleClose} />);

        const dismissButton = screen.getByText('Dismiss');
        fireEvent.click(dismissButton);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
