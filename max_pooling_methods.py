"""
max_pooling_methods.py

Portable implementations of common max-pooling variants for NumPy arrays,
with optional convenience wrappers for PyTorch (if available).

Functions:
- max_pool1d, max_pool2d, max_pool3d: NumPy implementations supporting
  kernel_size, stride, padding, dilation, and optional return_indices.
- global_max_pool: global spatial max over specified axes.
- torch_max_pool2d_wrapper: convenience wrapper that uses torch if installed.

Notes:
- NumPy implementation pads with -inf so that padded regions never win the max.
- Input shapes follow convention: (N, C, D), (N, C, H, W), (N, C, D, H, W).
- Indices returned (if requested) are flattened indices of the kernel window
  relative to the top-left-front corner of each pooling window (0 .. K-1).
"""

from typing import Optional, Tuple, Union
import numpy as np

# Try optional torch import for wrappers; keep module usable without torch.
try:
    import torch
    import torch.nn.functional as F  # type: ignore
    _HAS_TORCH = True
except Exception:
    _HAS_TORCH = False


def _to_tuple(value: Union[int, Tuple[int, ...]], ndim: int) -> Tuple[int, ...]:
    if isinstance(value, int):
        return tuple([value] * ndim)
    if isinstance(value, tuple):
        if len(value) != ndim:
            raise ValueError(f"Expected a tuple of length {ndim}, got {len(value)}")
        return value
    raise TypeError("kernel_size/stride/padding/dilation must be int or tuple of ints")


def _pad_with_neg_inf(x: np.ndarray, pad: Tuple[Tuple[int, int], ...]) -> np.ndarray:
    """
    Pad array `x` using constant padding value -inf. `pad` must be sequence of pairs
    like returned by np.pad for each dimension.
    """
    return np.pad(x, pad_width=pad, mode="constant", constant_values=-np.inf)


def _windowed_view(x: np.ndarray, kernel: Tuple[int, ...], stride: Tuple[int, ...], dilation: Tuple[int, ...]):
    """
    Create a sliding-window view of `x` for pooling using numpy.lib.stride_tricks.as_strided.

    x: numpy array with shape (..., *spatial_dims)
    kernel, stride, dilation: tuples for each spatial dimension

    Returns a view of shape (..., out_dim_1, ..., out_dim_k, k1, k2, ..., kk)
    """
    from numpy.lib.stride_tricks import as_strided

    ndim_total = x.ndim
    spatial_dims = len(kernel)
    spatial_shape = x.shape[-spatial_dims:]
    spatial_strides = x.strides[-spatial_dims:]

    # Effective kernel sizes with dilation: positions = 1 + (k-1)*d
    eff_k = tuple(1 + (k - 1) * d for k, d in zip(kernel, dilation))

    # Calculate output sizes
    out_shape = []
    for size, ek, s in zip(spatial_shape, eff_k, stride):
        out_dim = (size - ek) // s + 1
        if out_dim <= 0:
            raise ValueError("Kernel/dilation/stride result in non-positive output dimension.")
        out_shape.append(out_dim)

    # Build new shape and strides
    leading_shape = x.shape[:-spatial_dims]
    new_shape = tuple(leading_shape) + tuple(out_shape) + tuple(kernel)
    # Strides for each output step in spatial dims: stride * original_stride
    out_strides = tuple(x.strides[:ndim_total - spatial_dims]) + tuple(s * st for s, st in zip(stride, spatial_strides)) + tuple(d * st for d, st in zip(dilation, spatial_strides))

    return as_strided(x, shape=new_shape, strides=out_strides)


def _compute_pad_width(num_leading_dims: int, spatial_pad: Tuple[int, ...]) -> Tuple[Tuple[int, int], ...]:
    """
    Convert spatial_pad like (p1, p2, ...) to pad tuple for np.pad including
    leading (no pad) dims (e.g. for (N, C, H, W) we need two (0,0) pads).
    """
    return tuple((0, 0) for _ in range(num_leading_dims)) + tuple((p, p) for p in spatial_pad)


def _argmax_to_indices(argmax_flat: np.ndarray, kernel: Tuple[int, ...]) -> np.ndarray:
    """
    Convert flattened argmax (over k1*k2*... kernel entries) to an array of offsets
    with shape argmax_flat.shape + (len(kernel),) giving multi-dimensional index inside the kernel.
    """
    k_total = int(np.prod(kernel))
    if argmax_flat.dtype.kind not in ("i", "u"):
        argmax_flat = argmax_flat.astype(np.int64)
    # compute multi-index
    indices = []
    remaining = argmax_flat.copy()
    for k in reversed(kernel):
        idx = remaining % k
        indices.append(idx)
        remaining = remaining // k
    # reversed so reverse back
    indices = indices[::-1]
    return np.stack(indices, axis=-1)


def _max_pool_nd_numpy(x: np.ndarray,
                       kernel_size: Union[int, Tuple[int, ...]],
                       stride: Optional[Union[int, Tuple[int, ...]]] = None,
                       padding: Union[int, Tuple[int, ...]] = 0,
                       dilation: Union[int, Tuple[int, ...]] = 1,
                       return_indices: bool = False):
    """
    Generic N-D max pooling for NumPy arrays with shape (N, C, *spatial).
    Supports 1D/2D/3D spatial dims depending on kernel_size length.
    """
    if not isinstance(x, np.ndarray):
        raise TypeError("x must be a numpy.ndarray")

    if x.ndim < 3:
        raise ValueError("Input must have at least 3 dimensions: (N, C, *spatial)")

    spatial_ndim = len(x.shape) - 2
    kernel = _to_tuple(kernel_size, spatial_ndim)
    if stride is None:
        stride = kernel
    stride = _to_tuple(stride, spatial_ndim)
    padding = _to_tuple(padding, spatial_ndim)
    dilation = _to_tuple(dilation, spatial_ndim)

    # pad input
    num_leading = 2  # N, C
    pad_width = _compute_pad_width(num_leading, padding)
    x_padded = _pad_with_neg_inf(x, pad_width=pad_width)

    # Build windowed view
    view = _windowed_view(x_padded, kernel=kernel, stride=stride, dilation=dilation)
    # view shape: (N, C, out1, out2, ..., k1, k2, ...)
    # axes to reduce = last spatial_ndim axes
    reduce_axes = tuple(range(-spatial_ndim, 0))
    out = np.max(view, axis=reduce_axes)

    if not return_indices:
        return out

    # Get flattened argmax in windows
    argmax_flat = np.argmax(view.reshape(*view.shape[:-spatial_ndim], int(np.prod(kernel))), axis=-1)
    indices = _argmax_to_indices(argmax_flat, kernel)
    return out, indices


# Public API: dimension-specific wrappers


def max_pool1d(x: np.ndarray,
               kernel_size: Union[int, Tuple[int]],
               stride: Optional[Union[int, Tuple[int]]] = None,
               padding: Union[int, Tuple[int]] = 0,
               dilation: Union[int, Tuple[int]] = 1,
               return_indices: bool = False):
    """
    1D max pooling.
    Input shape: (N, C, L)
    """
    if x.ndim != 3:
        raise ValueError("max_pool1d expects input of shape (N, C, L)")
    return _max_pool_nd_numpy(x, kernel_size, stride, padding, dilation, return_indices)


def max_pool2d(x: np.ndarray,
               kernel_size: Union[int, Tuple[int, int]],
               stride: Optional[Union[int, Tuple[int, int]]] = None,
               padding: Union[int, Tuple[int, int]] = 0,
               dilation: Union[int, Tuple[int, int]] = 1,
               return_indices: bool = False):
    """
    2D max pooling.
    Input shape: (N, C, H, W)
    """
    if x.ndim != 4:
        raise ValueError("max_pool2d expects input of shape (N, C, H, W)")
    return _max_pool_nd_numpy(x, kernel_size, stride, padding, dilation, return_indices)


def max_pool3d(x: np.ndarray,
               kernel_size: Union[int, Tuple[int, int, int]],
               stride: Optional[Union[int, Tuple[int, int, int]]] = None,
               padding: Union[int, Tuple[int, int, int]] = 0,
               dilation: Union[int, Tuple[int, int, int]] = 1,
               return_indices: bool = False):
    """
    3D max pooling.
    Input shape: (N, C, D, H, W)
    """
    if x.ndim != 5:
        raise ValueError("max_pool3d expects input of shape (N, C, D, H, W)")
    return _max_pool_nd_numpy(x, kernel_size, stride, padding, dilation, return_indices)


def global_max_pool(x: np.ndarray, spatial_axes: Optional[Tuple[int, ...]] = None):
    """
    Global max-pooling across all spatial axes or those specified.

    x: numpy array with shape (N, C, *spatial)
    spatial_axes: tuple of axis indices relative to x (e.g., (-2, -1) for last two dims)
                  If None, use all axes after the first two.
    Returns: array with those axes reduced by max.
    """
    if not isinstance(x, np.ndarray):
        raise TypeError("x must be a numpy.ndarray")
    if x.ndim < 3:
        raise ValueError("Input must have at least 3 dimensions: (N, C, *spatial)")

    if spatial_axes is None:
        axes = tuple(range(2, x.ndim))
    else:
        axes = spatial_axes
    return np.max(x, axis=axes)


def torch_max_pool2d_wrapper(tensor, kernel_size, stride=None, padding=0, dilation=1, return_indices=False):
    """
    If PyTorch is available, call torch.nn.functional.max_pool2d with parameters.
    Accepts either numpy arrays (will be converted to torch tensors) or torch tensors.
    Returns same type as input (numpy -> numpy, torch -> torch).
    """
    if not _HAS_TORCH:
        raise RuntimeError("PyTorch is not available in this environment")

    is_numpy = isinstance(tensor, np.ndarray)
    if is_numpy:
        device = torch.device("cpu")
        t = torch.from_numpy(tensor).to(device)
    elif isinstance(tensor, torch.Tensor):
        t = tensor
    else:
        raise TypeError("tensor must be a numpy array or torch.Tensor")

    out = F.max_pool2d(t, kernel_size=kernel_size, stride=stride, padding=padding, dilation=dilation, return_indices=return_indices)
    if is_numpy:
        if isinstance(out, tuple):
            return tuple(o.cpu().numpy() for o in out)
        return out.cpu().numpy()
    return out


# Quick self-test when run as script
if __name__ == "__main__":
    # Small tests to verify behaviour
    rng = np.random.RandomState(0)
    x = rng.randn(1, 1, 6, 6).astype(np.float32)

    print("Input:\n", x[0, 0])

    out = max_pool2d(x, kernel_size=(2, 2), stride=(2, 2))
    print("\nMaxPool2d (2x2, stride 2):\n", out[0, 0])

    out, inds = max_pool2d(x, kernel_size=(3, 3), stride=(1, 1), padding=(1, 1), return_indices=True)
    print("\nMaxPool2d (3x3, stride 1, pad 1) output shape:", out.shape)
    print("Indices shape:", inds.shape)

    # Compare with a simple naive sliding window reference for correctness
    def naive_max_pool2d_ref(x, k, s, p):
        x_p = np.pad(x, ((0, 0), (0, 0), (p, p), (p, p)), constant_values=-np.inf)
        N, C, H, W = x_p.shape
        out_h = (H - k) // s + 1
        out_w = (W - k) // s + 1
        y = np.empty((N, C, out_h, out_w), dtype=x.dtype)
        for n in range(N):
            for c in range(C):
                for i in range(out_h):
                    for j in range(out_w):
                        y[n, c, i, j] = np.max(x_p[n, c, i * s:i * s + k, j * s:j * s + k])
        return y

    ref = naive_max_pool2d_ref(x, 3, 1, 1)
    np.testing.assert_allclose(out, ref, atol=1e-6)
    print("\nNumPy max_pool2d matches naive reference for the tested case.")
