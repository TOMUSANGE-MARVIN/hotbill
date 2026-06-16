<?php

use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\PackageController;
use App\Http\Controllers\Api\PortalController;
use App\Http\Controllers\Api\RadiusController;
use App\Http\Controllers\Api\RouterController;
use App\Http\Controllers\Api\RouterSetupController;
use App\Http\Controllers\Api\SubscriberController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\VoucherController;
use Illuminate\Support\Facades\Route;

// ── Public ──────────────────────────────────────────────
Route::prefix('v1')->group(function () {

    // Auth
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);

    // Router heartbeat & install script (authenticated by router bearer token, not user token)
    Route::post('routers/heartbeat', [RouterController::class, 'heartbeat']);
    Route::get('routers/scripts/install', [RouterController::class, 'installScript']);

    // RADIUS callbacks (secured by X-Radius-Secret header)
    Route::prefix('radius')->group(function () {
        Route::post('authorize', [RadiusController::class, 'authorize']);
        Route::post('accounting', [RadiusController::class, 'accounting']);
    });

    // Captive portal (public — hotspot clients pre-auth)
    Route::prefix('portal')->group(function () {
        Route::get('routers/{router}/packages', [PortalController::class, 'packages']);
        Route::get('routers/{router}/login.html', [PortalController::class, 'loginTemplate']);
        Route::post('pay', [PortalController::class, 'pay']);
        Route::get('ipn', [PortalController::class, 'ipn']);
        Route::get('orders/{reference}/status', [PortalController::class, 'status']);
    });
});

// ── Authenticated (Sanctum) ──────────────────────────────
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Dashboard & Analytics
    Route::get('analytics/dashboard', [AnalyticsController::class, 'dashboard']);
    Route::get('analytics/usage', [AnalyticsController::class, 'usageAnalytics']);

    // Routers
    Route::apiResource('routers', RouterController::class);
    Route::get('routers/{router}/script', [RouterController::class, 'script']);
    Route::get('routers/{router}/stats', [RouterController::class, 'stats']);
    Route::post('routers/{router}/test-connection', [RouterController::class, 'testConnection']);
    Route::post('routers/{router}/reboot', [RouterController::class, 'reboot']);
    Route::post('routers/{router}/admin-password', [RouterController::class, 'updateAdminPassword']);
    Route::post('routers/{router}/command', [RouterController::class, 'remoteCommand']);

    // Router setup wizard (topology designer)
    Route::get('routers/{router}/topology', [RouterSetupController::class, 'topology']);
    Route::post('routers/{router}/interfaces/toggle', [RouterSetupController::class, 'toggleInterface']);
    Route::get('routers/{router}/bridges', [RouterSetupController::class, 'bridges']);
    Route::post('routers/{router}/bridges', [RouterSetupController::class, 'deployBridge']);
    Route::get('routers/{router}/bridges/{bridge}/script', [RouterSetupController::class, 'bootstrapScriptFor']);

    // Organization settings + operator wallet
    Route::get('tenant', [TenantController::class, 'show']);
    Route::patch('tenant', [TenantController::class, 'update']);
    Route::get('wallet', [WalletController::class, 'index']);
    Route::post('wallet/withdraw', [WalletController::class, 'withdraw']);

    // Packages
    Route::apiResource('packages', PackageController::class);

    // Subscribers
    Route::apiResource('subscribers', SubscriberController::class);
    Route::post('subscribers/{subscriber}/suspend', [SubscriberController::class, 'suspend']);
    Route::post('subscribers/{subscriber}/activate', [SubscriberController::class, 'activate']);
    Route::post('subscribers/{subscriber}/topup', [SubscriberController::class, 'topup']);

    // Vouchers
    Route::get('vouchers', [VoucherController::class, 'index']);
    Route::post('vouchers/redeem', [VoucherController::class, 'redeem']);
    Route::post('vouchers/{voucher}/revoke', [VoucherController::class, 'revoke']);
    Route::get('voucher-batches', [VoucherController::class, 'batches']);
    Route::post('voucher-batches', [VoucherController::class, 'createBatch']);
    Route::get('voucher-batches/{batch}/print', [VoucherController::class, 'print']);

    // Transactions
    Route::get('transactions', [TransactionController::class, 'index']);
    Route::post('transactions', [TransactionController::class, 'store']);
    Route::get('transactions/summary', [TransactionController::class, 'summary']);
    Route::get('transactions/{transaction}', [TransactionController::class, 'show']);

    // Agents
    Route::apiResource('agents', AgentController::class);
    Route::post('agents/{agent}/topup', [AgentController::class, 'topup']);

    // Expenses
    Route::apiResource('expenses', ExpenseController::class)->except('show');
    Route::get('expenses/summary', [ExpenseController::class, 'summary']);

    // Campaigns
    Route::apiResource('campaigns', CampaignController::class)->except('show', 'update');
    Route::post('campaigns/{campaign}/send', [CampaignController::class, 'send']);
});
