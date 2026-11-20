import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardScreen } from '../screens/DashboardScreen.js';

describe('DashboardScreen (Frontend)', () => {
  it('renders call initiation form with phone input and start call button', () => {
    const handleStartCall = vi.fn();
    const handleViewReport = vi.fn();

    render(
      <DashboardScreen
        onStartCall={handleStartCall}
        onViewReport={handleViewReport}
        recentCalls={[]}
        isInitiating={false}
      />
    );

    expect(screen.getByText('Initiate Customer Call')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('+1 (555) 000-0000')).toBeInTheDocument();
    expect(screen.getByText('Start Live Call')).toBeInTheDocument();
  });

  it('triggers onStartCall when form is submitted', () => {
    const handleStartCall = vi.fn();
    const handleViewReport = vi.fn();

    render(
      <DashboardScreen
        onStartCall={handleStartCall}
        onViewReport={handleViewReport}
        recentCalls={[]}
        isInitiating={false}
      />
    );

    const input = screen.getByPlaceholderText('+1 (555) 000-0000');
    fireEvent.change(input, { target: { value: '+15551234567' } });

    const submitBtn = screen.getByText('Start Live Call');
    fireEvent.click(submitBtn);

    expect(handleStartCall).toHaveBeenCalledWith('+15551234567', expect.any(String));
  });

  it('renders recent call history list', () => {
    const recent = [
      {
        id: 'call_1',
        customerPhoneNumber: '+15559998888',
        livekitRoomId: 'room_1',
        status: 'COMPLETED' as const,
        duration: 125,
        createdAt: new Date().toISOString(),
      },
    ];

    render(
      <DashboardScreen
        onStartCall={vi.fn()}
        onViewReport={vi.fn()}
        recentCalls={recent}
        isInitiating={false}
      />
    );

    expect(screen.getByText('+15559998888')).toBeInTheDocument();
    expect(screen.getByText('View Post-Call Report')).toBeInTheDocument();
  });
});
