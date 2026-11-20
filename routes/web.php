<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Web\CiaController;

/*
|--------------------------------------------------------------------------
| Web Routes — Cynaris Recruitment Platform
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group.
|
*/

Route::get('/', function () {
    return redirect()->route('candidate.cia');
});

// Career Intelligence Advisor (CIA Mode) Routes
Route::prefix('candidate/cia')->name('candidate.cia.')->group(function () {
    // Main UI Dashboard
    Route::get('/', [CiaController::class, 'index'])->name('index');
    
    // Quantitative Skill Gap Calculation Endpoint
    Route::post('/analyze-gap', [CiaController::class, 'analyzeGap'])->name('analyze-gap');
    
    // AI Trajectory & Learning Recommendations
    Route::post('/recommendations', [CiaController::class, 'getRecommendations'])->name('recommendations');
    
    // ChromaDB Vector Search Endpoint
    Route::get('/vector-search', [CiaController::class, 'vectorSearch'])->name('vector-search');
    
    // Health & Provider Diagnostics
    Route::get('/health', [CiaController::class, 'health'])->name('health');
});
